from __future__ import annotations
from datetime import datetime
import traceback
import asyncio
import time
import pandas as pd

import rq
from ..core.config import upstash_connection
from ..services.files import insert_file_row, fetch_dataset, extract_schema_sample
from ..core.ai_agent import execute_flexible_agentic_flow
from ..services.chats import append_chat_msg, upsert_chart

queue = rq.Queue("prompts", connection=upstash_connection())

async def process_prompt(
    *,
    request_id: str,
    csv_url: str,
    prompt: str,
    chat_id: str,
    user_id: str | None,
    max_retries: int = 3,
    retry_delay: int = 5
) -> None:
    """
    End-to-end pipeline executed in background; uses the flexible agentic flow
    and writes results back to Supabase.
    
    Args:
        request_id: Unique identifier for this request
        csv_url: URL to the CSV data file
        prompt: User query to process
        chat_id: Chat session identifier
        user_id: User identifier
        max_retries: Maximum number of retries on failure
        retry_delay: Delay between retries in seconds
    """
    retry_count = 0
    last_error = None
    
    # Mark processing has started
    append_chat_msg(
        chat_id,
        {
            "role": "system",
            "message": "Processing your request...",
            "timestamp": datetime.now().isoformat(),
            "status": "processing",
            "request_id": request_id
        }
    )
    
    while retry_count <= max_retries:
        try:
            # Step 1: Register file and fetch dataset
            file_id = insert_file_row(user_id or "anonymous", csv_url)
            df = fetch_dataset(csv_url, file_id)
            
            # Step 2: Use the flexible agentic flow to process the request
            result = await execute_flexible_agentic_flow(
                df=df,
                user_query=prompt,
                chat_id=chat_id,
                user_id=user_id,
                is_follow_up=False,
                previous_analysis=None
            )
            
            # Step 3: Process the results
            
            # If there's a visualization, create it in the database
            chart_id = None
            if "visualization" in result and result["visualization"]:
                chart_id = upsert_chart(chat_id, result["visualization"])
            
            # Create the message content based on the result
            message_content = ""
            
            # Add insights if available
            if "insights" in result and result["insights"]:
                if "summary" in result["insights"]:
                    message_content += f"{result['insights']['summary']}\n\n"
                if "points" in result["insights"]:
                    message_content += "\n".join([f"• {point}" for point in result["insights"]["points"]])
                    message_content += "\n\n"
            
            # Add the answer
            if "answer" in result:
                message_content += result["answer"]
            
            # Add chart reference if available
            if chart_id:
                message_content += f"\n\n[chart:{chart_id}]"
            
            # Add the message to the chat
            append_chat_msg(
                chat_id,
                {
                    "role": "assistant",
                    "message": message_content,
                    "timestamp": datetime.now().isoformat(),
                    "status": "completed",
                    "request_id": request_id
                }
            )
            
            # Successfully processed, break out of retry loop
            break
            
        except Exception as exc:
            retry_count += 1
            last_error = exc
            traceback.print_exc()
            
            # If we've reached max retries, send error message
            if retry_count > max_retries:
                append_chat_msg(
                    chat_id,
                    {
                        "role": "system",
                        "message": f"❌ Failed to process your request: {str(exc)}",
                        "timestamp": datetime.now().isoformat(),
                        "status": "error",
                        "request_id": request_id
                    }
                )
                raise exc
            else:
                # Log retry attempt
                append_chat_msg(
                    chat_id,
                    {
                        "role": "system",
                        "message": f"Retrying... (Attempt {retry_count} of {max_retries})",
                        "timestamp": datetime.now().isoformat(),
                        "status": "retrying",
                        "request_id": request_id
                    }
                )
                
                # Wait before retrying
                time.sleep(retry_delay) 