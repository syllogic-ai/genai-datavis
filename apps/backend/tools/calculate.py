import os
from typing import Any

import duckdb
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent
from supabase import create_client, Client
from dotenv import dotenv_values


from ..core.models import LLMUsageRow
from ..utils.logging import _log_llm
from ..core.config import supabase as sb
from ..utils.files import extract_schema_sample

class Deps(BaseModel):
    chat_id: str
    request_id: str
    file_id: str
    duck: duckdb.DuckDBPyConnection
    
    model_config = {"arbitrary_types_allowed": True}


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


@Tool(name="calculate")
async def calculate(input: CalcInput, ctx: RunContext[Deps]) -> CalcOutput:
    """
    Generate SQL query based on user prompt and dataset profile.
    
    Args:
        input: Contains the user's prompt
        ctx: Context with dependencies including file_id
        
    Returns:
        CalcOutput containing the generated SQL query
        
    Raises:
        ValueError: If the generated SQL doesn't end with a semicolon
    """
    # Get the dataset profile using extract_schema_sample
    profile = extract_schema_sample(ctx.deps.file_id)
    
    # Build prompt with schema and sample data
    schema_table = "\n".join([
        f"| {col_name} | {data_type} |"
        for col_name, data_type in profile.columns.items()
    ])
    
    # Format sample rows as a table
    # First get all column names to ensure consistent order
    col_names = list(profile.columns.keys())
    
    # Create header row
    sample_table = "| " + " | ".join(col_names) + " |\n"
    # Add separator row
    sample_table += "|" + "|".join(["---"] * len(col_names)) + "|\n"
    
    # Add data rows
    for row in profile.sample_rows:
        sample_table += "| " + " | ".join(str(row.get(col, "")) for col in col_names) + " |\n"
    
    prompt = f"""
Schema:
| Column | Type |
|--------|------|
{schema_table}

Sample data:
{sample_table}

User question: {input.user_prompt}
"""
    
    # Create a modified input with the formatted prompt
    modified_input = CalcInput(user_prompt=prompt)
    
    # Generate SQL with Logfire instrumentation
    with logfire.span("generate_sql", attributes={"tool": "calculate"}) as sp:
        result = await sql_agent.run(
            input=modified_input,
            ctx=ctx,
            # post_run_hooks=[lambda: persist_usage(sp, ctx)]
        )
    
    # Validate SQL ends with semicolon
    if not result.sql.strip().endswith(";"):
        raise ValueError("Generated SQL must end with a semicolon")
    
    return result
