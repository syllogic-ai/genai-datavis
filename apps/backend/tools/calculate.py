import os
from typing import Any

import duckdb
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, tool, Agent
from supabase import create_client, Client
from dotenv import dotenv_values


from ..core.models import LLMUsageRow
from ..utils.logging import _log_llm

# Environment variable checks
SUPABASE_URL = dotenv_values("SUPABASE_URL")
SUPABASE_KEY = dotenv_values("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing required environment variables: SUPABASE_URL and SUPABASE_KEY")


class Deps(BaseModel):
    chat_id: str
    request_id: str
    file_id: str
    duck: duckdb.DuckDBPyConnection


class CalcInput(BaseModel):
    user_prompt: str = Field(description="The user's question about the data")


class CalcOutput(BaseModel):
    sql: str = Field(description="Generated DuckDB SQL query")


# Create SQL generation agent
sql_agent = Agent(
    "openai:gpt-4-1-mini",
    deps_type=Deps,
    output_type=CalcOutput,
    system_prompt=(
        "You are a SQL expert specializing in DuckDB. Given a dataset schema, sample data, "
        "and a user's question, generate ONLY valid DuckDB SQL queries. "
        "Your response must be a single SQL query terminated with a semicolon. "
        "Do not include any explanations or commentary."
    ),
)


async def persist_usage(span: Any, ctx: RunContext[Deps]) -> None:
    """Post-run hook to persist LLM usage metrics using the existing _log_llm function."""
    usage = LLMUsageRow(
        request_id=ctx.deps.request_id,
        chat_id=ctx.deps.chat_id,
        model=span.attributes["model_name"],
        provider=span.attributes["provider"],
        api_request="calculate",
        input_tokens=span.attributes["prompt_tokens"],
        output_tokens=span.attributes["completion_tokens"],
        compute_time=span.attributes["duration_ms"],
        total_cost=span.attributes["cost_usd"]
    )
    _log_llm(usage)


@tool(name="calculate")
async def calculate(input: CalcInput, ctx: RunContext[Deps]) -> CalcOutput:
    """
    Generate SQL query based on user prompt and dataset profile.
    
    Args:
        input: Contains the user's prompt
        ctx: Context with dependencies including dataset profile
        
    Returns:
        CalcOutput containing the generated SQL query
        
    Raises:
        ValueError: If the generated SQL doesn't end with a semicolon
    """
    # Build prompt with schema and sample data
    schema_table = "\n".join([
        f"| {col.name} | {col.dtype} | {col.null_percent}% |"
        for col in ctx.deps.profile.schema
    ])
    
    sample_table = "\n".join([
        "| " + " | ".join(str(val) for val in row) + " |"
        for row in ctx.deps.profile.sample
    ])
    
    prompt = f"""
Schema:
| Column | Type | Null % |
|--------|------|--------|
{schema_table}

Sample data (first 5 rows):
{sample_table}

User question: {input.user_prompt}
"""
    
    # Generate SQL with Logfire instrumentation
    with logfire.span("generate_sql", attributes={"tool": "calculate"}) as sp:
        result = await sql_agent.run(
            input=input,
            ctx=ctx,
            post_run_hooks=[lambda: persist_usage(sp, ctx)]
        )
    
    # Validate SQL ends with semicolon
    if not result.sql.strip().endswith(";"):
        raise ValueError("Generated SQL must end with a semicolon")
    
    return result
