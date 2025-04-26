from __future__ import annotations
from datetime import datetime
import traceback
import asyncio

import rq
from ..core.config import upstash_connection
from ..services.files import insert_file_row, fetch_dataset, extract_schema_sample
from ..services.sql import guard_sql, run_sql
from ..services.charts import choose_chart_type, build_chart_spec
from ..services.insights import generate_insights
from ..services.chats import append_chat_msg, upsert_chart
from ..core.models import SQLRequest
from ..services.sql_llm import generate_sql

queue = rq.Queue("prompts", connection=upstash_connection())

def process_prompt(
    *,
    request_id: str,
    csv_url: str,
    prompt: str,
    chat_id: str,
    user_id: str | None,
) -> None:
    """
    End-to-end pipeline executed in background; writes results back to Supabase.
    """
    try:
        file_id = insert_file_row(user_id or "anonymous", csv_url)
        fetch_dataset(csv_url, file_id)
        profile = extract_schema_sample(file_id)

        sql_req = SQLRequest(prompt=prompt, profile=profile)
        chart_choice = choose_chart_type(sql_req)

        sql_resp = asyncio.run(generate_sql(sql_req)) if asyncio.iscoroutinefunction(generate_sql) else generate_sql(sql_req)
        safe_sql = guard_sql(sql_resp.sql)
        df = run_sql(file_id, safe_sql)

        insight = generate_insights(df, prompt, chat_id, user_id)
        chart_spec = build_chart_spec(chart_choice, df, prompt, chat_id, user_id)
        chart_id = upsert_chart(chat_id, chart_spec)

        summary = "\n".join(insight.bullets) if insight else "Chart ready."
        append_chat_msg(
            chat_id,
            {
                "role": "system",
                "message": f"{summary}\n\n[chart:{chart_id}]",
                "timestamp": datetime.now(datetime.UTC).isoformat(),
            },
        )
    except Exception as exc:
        traceback.print_exc()
        append_chat_msg(
            chat_id,
            {
                "role": "system",
                "message": f"❌ Failed: {exc}",
                "timestamp": datetime.now(datetime.UTC).isoformat(),
            },
        )
        raise 