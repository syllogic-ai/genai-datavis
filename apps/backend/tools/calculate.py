import os
from typing import Any
import ssl
import uuid

import duckdb
import logfire
from pydantic import BaseModel, Field
from pydantic_ai import RunContext, Tool, Agent
from supabase import create_client, Client
from dotenv import dotenv_values
import asyncio
from httpx import AsyncClient


from apps.backend.core.config import supabase as sb
from apps.backend.utils.files import extract_schema_sample
from apps.backend.core.models import DatasetProfile

# Fix SSL certificate verification issues for macOS
ssl._create_default_https_context = ssl._create_unverified_context

class Deps(BaseModel):
    chat_id: str
    request_id: str
    file_id: str
    duck: duckdb.DuckDBPyConnection
    supabase: Client
    model_config = {"arbitrary_types_allowed": True}


class SQLInput(BaseModel):
    user_prompt: str = Field(description="The user's question about the data")


class CalcInput(BaseModel):
    sql: str = Field(description="Generated DuckDB SQL query")
    
class SQLOutput(BaseModel):
    chart_id: str = Field(description="The ID of the chart that has been created")


# Create SQL generation agent
sql_agent = Agent(
    "openai:gpt-4o",
    deps_type=Deps,
    output_type=SQLOutput,
)

@sql_agent.system_prompt
async def system_prompt(ctx: RunContext[Deps]) -> str:
    """
    Generate a system prompt that describes the database schema and sample data.
    
    The user's query will be added by the agent framework.
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
    You are a SQL expert specializing in DuckDB. Given a dataset schema, sample data, 
    and a user's question, generate ONLY valid DuckDB SQL queries. 
    Your response must be a single SQL query terminated with a semicolon. 
    Do not include any explanations or commentary.
        
    Here is the schema and sample data:

    Schema:
    | Column | Type |
    |--------|------|
    {schema_table}

    Sample data:
    {sample_table}

"""

    return prompt


@sql_agent.tool
async def calculate(ctx: RunContext[Deps], input: CalcInput) -> SQLOutput:
    """
    Execute the SQL query and create a chart record in Supabase.
    
    Args:
        ctx: The run context containing dependencies
        input: The input containing the SQL query
        
    Returns:
        SQLOutput with the chart ID
    """
    sql = input.sql
    
    # Convert to uppercase for case-insensitive comparison
    sql_upper = sql.upper()
    
    # Check for disallowed operations
    disallowed = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', '/*']
    for term in disallowed:
        if term.upper() in sql_upper:
            raise ValueError(f"SQL query contains disallowed term: {term}")
    
    # Create a new chart record in Supabase
    
    # Get the chat_id from dependencies
    chat_id = ctx.deps.chat_id
    
    # Generate chart id
    chart_id = str(uuid.uuid4())
    
    # Insert the SQL query into the charts table using Supabase client
    try:
        # Use the Supabase client to insert the record
        result = ctx.deps.supabase.table("charts").insert({
            "id": chart_id,
            "chat_id": chat_id,
            "sql": sql
        }).execute()
        
        # Verify the insertion was successful
        if not result.data or len(result.data) == 0:
            raise ValueError("Failed to create chart record")
            
    except Exception as e:
        raise ValueError(f"Error creating chart record: {str(e)}")
    
    return SQLOutput(chart_id=result.data[0]["id"])
    
async def main():
    async with AsyncClient() as client:
        
        # Create dependencies
        deps = Deps(
            chat_id="87939486-f970-4c1a-8b8d-85262607d47c",
            request_id="request_123",
            file_id="1da2a57e-a87c-4f0f-9046-3c980a1ade29",
            duck=duckdb.connect(),
            supabase=sb
        )
        
        # The correct way to call run with the input
        result = await sql_agent.run(
            "Which date did we have the most sales?", 
            deps=deps
        )
        print(result)
        
if __name__ == "__main__":
    asyncio.run(main())