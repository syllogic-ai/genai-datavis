import duckdb
import polars as pl
import re
import uuid
import os
import time
from typing import Optional, Dict, Any, Union, List
from pydantic import BaseModel, ConfigDict, Field
from pydantic_ai import Agent, ModelRetry, RunContext

from ..core.config import supabase
from ..core.models import LLMUsageRow

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

class SQLValidationResult(BaseModel):
    """Result of SQL validation with optional explanation."""
    is_valid: bool
    explanation: str
    suggested_fix: Optional[str] = None
    model_config = ConfigDict(extra="forbid")

async def _log(row: LLMUsageRow) -> None:
    supabase.table("llm_usage").insert(row.model_dump()).execute()

def guard_sql(sql: str) -> str:
    """
    Guards SQL queries to only allow safe operations.
    
    Allowed: SELECT, LIMIT, ORDER BY, GROUP BY, WHERE, HAVING, simple window functions
    Disallowed: ;, DROP, DELETE, INSERT, UPDATE, ALTER, --, /*
    
    Args:
        sql: The SQL query to guard
        
    Returns:
        The validated SQL query
        
    Raises:
        ValueError: If the SQL query contains disallowed operations
    """
    # Convert to uppercase for case-insensitive comparison
    sql_upper = sql.upper()
    
    # Check for disallowed operations
    disallowed = [';', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', '/*']
    for term in disallowed:
        if term.upper() in sql_upper:
            raise ValueError(f"SQL query contains disallowed term: {term}")
    
    # Validate SQL with DuckDB's explain
    try:
        duckdb.explain(sql)
    except Exception as e:
        raise ValueError(f"Invalid SQL query: {str(e)}")
    
    return sql

async def validate_sql(
    sql: str, 
    chat_id: str,
    request_id: str
) -> SQLValidationResult:
    """
    Validates SQL query using Pydantic AI and provides explanations.
    
    Args:
        sql: The SQL query to validate
        chat_id: The chat ID for tracking
        request_id: The unique request ID
        
    Returns:
        SQLValidationResult with validation status and explanation
    """
    t0 = time.perf_counter()
    
    # Create validation agent
    validation_agent = Agent(
        OPENAI_MODEL,
        output_type=SQLValidationResult,
        instrument=True,
        retry=ModelRetry(max_retries=3, delay=0.5),
    )
    
    # Define system prompt
    @validation_agent.system_prompt
    async def system_prompt() -> str:
        return """
        You are a SQL expert tasked with validating SQL queries.
        Assess if the query follows these rules:
        
        ALLOWED:
        - SELECT statements
        - WHERE, GROUP BY, HAVING, ORDER BY clauses
        - Aggregate functions (COUNT, SUM, AVG, etc.)
        - JOINs
        - Simple window functions
        - Subqueries
        
        DISALLOWED:
        - Multiple statements (using semicolons)
        - Data modification (INSERT, UPDATE, DELETE)
        - Schema modification (CREATE, DROP, ALTER)
        - SQL comments (-- or /* */)
        - System commands
        
        Provide clear explanation of issues found and suggest fixes if needed.
        """
    
    # User prompt with SQL query
    user_prompt = f"""
    Please validate the following SQL query:
    
    ```sql
    {sql}
    ```
    
    Is this query valid according to the rules? Provide explanation and suggested fixes if needed.
    """
    
    try:
        # Run the validation agent
        result = await validation_agent.run(user_prompt)
        
        # Calculate metrics
        latency = int((time.perf_counter() - t0) * 1000)
        
        # Simplified token estimation
        system_prompt_text = await system_prompt()
        prompt_tokens = len(system_prompt_text) + len(user_prompt)
        completion_tokens = len(str(result.output))
        
        # Estimate tokens (1 token ≈ 4 characters in English)
        estimated_prompt_tokens = prompt_tokens // 4
        estimated_completion_tokens = completion_tokens // 4
        
        # Simplified cost calculation
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
                api_request="validate_sql",
                input_tokens=estimated_prompt_tokens,
                output_tokens=estimated_completion_tokens,
                compute_time=latency,
                total_cost=estimated_cost,
            )
        )
        
        return result.output
    except Exception as e:
        # If validation fails, return a failure result
        return SQLValidationResult(
            is_valid=False,
            explanation=f"Validation failed: {str(e)}",
            suggested_fix=None
        )

def run_sql(file_id: str, sql: str) -> pl.DataFrame:
    """
    Runs a SQL query against a CSV file.
    
    Args:
        file_id: The ID of the file
        sql: The SQL query to run
        
    Returns:
        A Polars DataFrame with the query results
    """
    # Build signed URL
    url = supabase.storage.from_("datasets").get_public_url(f"{file_id}.csv")
    
    # Create view
    duckdb.execute(f"CREATE OR REPLACE VIEW v AS read_csv_auto('{url}')")
    
    # Execute query and return as Polars DataFrame
    result = duckdb.execute(sql).arrow()
    return pl.from_arrow(result) 