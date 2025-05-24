#!/usr/bin/env python3
"""
Script to execute SQL queries on CSV files stored in Supabase.

Usage:
    python execute_sql.py <file_id> <chart_id>

Arguments:
    file_id: The ID of the file in Supabase
    chart_id: The ID of the chart in Supabase containing the SQL query
"""

import sys
import duckdb
import polars as pl
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = Path(__file__).resolve().parent.parent / "apps" / "backend" / ".env.local"

print(f"Loading from: {env_path}")
print("File exists:", env_path.exists())

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Optional for now

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# Check arguments
if len(sys.argv) != 3:
    print("Usage: python execute_sql.py <file_id> <chart_id>")
    sys.exit(1)

file_id = sys.argv[1]
chart_id = sys.argv[2]


def get_storage_path(file_id: str) -> str:
    """
    Get the storage path for a file from Supabase.
    
    Args:
        file_id: The ID of the file
        
    Returns:
        The storage path
    """
    file_record = supabase.table("files").select("storage_path").eq("id", file_id).execute().data
    
    if not file_record or len(file_record) == 0:
        raise ValueError(f"File with ID {file_id} not found in database")
    
    storage_path = file_record[0]["storage_path"]
    
    return storage_path

def get_sql_query(chart_id: str) -> str:
    """
    Get the SQL query for a chart from Supabase.
    
    Args:
        chart_id: The ID of the chart
        
    Returns:
        The SQL query
    """
    chart_record = supabase.table("charts").select("sql").eq("id", chart_id).execute().data
    
    if not chart_record or len(chart_record) == 0:
        raise ValueError(f"Chart with ID {chart_id} not found in database")
    
    sql_query = chart_record[0].get("sql")
    
    if not sql_query:
        raise ValueError(f"No SQL query found for chart with ID {chart_id}")
    
    return sql_query

def guard_sql(sql: str) -> str:
    """
    Guards SQL queries to only allow safe operations.
    
    Allowed: SELECT, LIMIT, ORDER BY, GROUP BY, WHERE, HAVING, simple window functions
    Disallowed: DROP, DELETE, INSERT, UPDATE, ALTER, --, /*
    
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
    disallowed = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', '/*']
    for term in disallowed:
        if term.upper() in sql_upper:
            raise ValueError(f"SQL query contains disallowed term: {term}")
    
    # Simple check to ensure it's a SELECT query
    if not sql_upper.strip().startswith('SELECT'):
        raise ValueError("SQL query must start with SELECT")
    
    return sql

def run_sql_on_csv(storage_path: str, sql: str) -> pl.DataFrame:
    """
    Run SQL query on a CSV file.
    
    Args:
        storage_path: The storage path of the CSV file
        sql: The SQL query to run
        
    Returns:
        The result of the SQL query as a Polars DataFrame
    """
    url = storage_path
    
    print(f"Running SQL query on file: {url}")
    
    # Replace 'dataset' with 'data_view' in the SQL query
    modified_sql = sql.replace("dataset", "data_view")
    
    # Create view and run query
    duckdb.execute(f"CREATE OR REPLACE VIEW data_view AS SELECT * FROM read_csv_auto('{url}')")
    
    # Execute query and return as Polars DataFrame
    result = duckdb.execute(modified_sql).arrow()
    return pl.from_arrow(result)

def main():
    try:
        # Get storage path and SQL query
        storage_path = get_storage_path(file_id)
        sql_query = get_sql_query(chart_id)
        
        # Validate SQL query
        validated_sql = guard_sql(sql_query)
        
        # Run SQL query
        result_df = run_sql_on_csv(storage_path, validated_sql)
        
        # Print result
        print("\nSQL Query Result:")
        print(result_df)
        
        # Save result to CSV
        output_file = f"sql_result_{chart_id}.csv"
        result_df.write_csv(output_file)
        print(f"\nResult saved to {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
