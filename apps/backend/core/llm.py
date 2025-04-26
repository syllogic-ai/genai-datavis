from __future__ import annotations
import time, typing as t
from pydantic_ai import Agent, ModelRetry, RunContext
from .config import supabase
from .models import LLMUsageRow
import os
import uuid

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

async def _log(row: LLMUsageRow) -> None:
    supabase.table("llm_usage").insert(row.model_dump()).execute()

async def llm_call(
    system: str,
    user: str,
    out_model: type[t.Any],
    chat_id: str,
    api_request: str,
    user_id: str | None = None,
    request_id: str | None = None,
) -> t.Any:
    request_id = request_id or str(uuid.uuid4())
    t0 = time.perf_counter()
    
    # Create a function that will create the agent for each output type
    def create_agent(output_type: type):
        return Agent(
            OPENAI_MODEL,
            output_type=output_type,
            instrument=True,
            retry=ModelRetry(max_retries=3, delay=0.5),
        )
    
    # Create agent for the specified output model
    agent = create_agent(out_model)
    
    # Define system prompt function
    @agent.system_prompt
    async def system_prompt_func() -> str:
        return system
    
    # Run the agent
    result = await agent.run(user)
    
    # Calculate metrics
    latency = int((time.perf_counter() - t0) * 1000)
    
    # Estimating token usage based on string lengths (simplified)
    # In a real implementation, we'd get this from OpenAI's API response
    prompt_tokens = len(system) + len(user)
    completion_tokens = len(str(result.output))
    
    # Estimate cost (simplified)
    # 1 token ≈ 4 characters in English
    estimated_prompt_tokens = prompt_tokens // 4
    estimated_completion_tokens = completion_tokens // 4
    
    # Simplified cost calculation (would need to be adapted based on actual model pricing)
    cost_per_1k_input = 0.0001  # Example placeholder value
    cost_per_1k_output = 0.0002  # Example placeholder value
    estimated_cost = (
        (estimated_prompt_tokens / 1000) * cost_per_1k_input + 
        (estimated_completion_tokens / 1000) * cost_per_1k_output
    )
    
    # Log usage
    await _log(
        LLMUsageRow(
            request_id=request_id,
            chat_id=chat_id,
            model=OPENAI_MODEL,
            provider="OpenAI",
            api_request=api_request,
            input_tokens=estimated_prompt_tokens,
            output_tokens=estimated_completion_tokens,
            compute_time=latency,
            total_cost=estimated_cost,
        )
    )
    
    return result.output 