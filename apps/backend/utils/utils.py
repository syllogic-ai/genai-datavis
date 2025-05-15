import time
import requests
import io
import pandas as pd
import duckdb
import logfire
from supabase import Client
from typing import Union, List, Dict, Any
import json

def filter_messages_to_role_content(json_array: Union[str, List[Dict[str, Any]]]) -> List[Dict[str, str]]:
    """
    Compact version of the filter function using list comprehension.
    """
    # Parse JSON string if needed
    if isinstance(json_array, str):
        messages = json.loads(json_array)
    else:
        messages = json_array
    
    # Use list comprehension for filtering
    return [
        {k: v for k, v in message.items() if k in ['role', 'content']}
        for message in messages
        if isinstance(message, dict) and any(k in message for k in ['role', 'content'])
    ]

def get_data(file_id: str, chart_id: str, supabase: Client = None, duck_connection: duckdb.DuckDBPyConnection = None) -> pd.DataFrame:
    """
    Retrieve and execute SQL on a dataset associated with a chart.

    Args:
        file_id: ID of the uploaded file.
        chart_id: ID of the chart.
        supabase: Optional Supabase client. If not provided, function should be called from a context where supabase is in scope.
        duck_connection: Optional DuckDB connection. If not provided, function should be called from a context where duck_connection is in scope.

    Returns:
        A DataFrame with the query results.
    """
    # This function is designed to be callable from both main.py (where supabase and duck_connection are globals)
    # and calculate.py (where they are passed as parameters)
    
    # Use global variables if parameters aren't provided - these will be used when called from main.py
    if supabase is None:
        # This will use the supabase global from the calling module
        # only works when called from main.py
        from apps.backend.app.main import supabase
        
    if duck_connection is None:
        # This will use the duck_connection global from the calling module
        # only works when called from main.py
        from apps.backend.app.main import duck_connection
    
    start_time = time.time()
    logfire.info("Getting chart data", file_id=file_id, chart_id=chart_id)

    try:
        # Fetch the SQL query from the chart
        chart_result = supabase.table("charts").select("sql").eq("id", chart_id).execute()

        if not chart_result.data:
            logfire.warn("No chart found", chart_id=chart_id)
            return pd.DataFrame()

        sql_query = chart_result.data[0].get("sql")
        if not sql_query:
            logfire.warn("No SQL query found", chart_id=chart_id)
            return pd.DataFrame()

        # Fetch the storage path for the file
        file_result = supabase.table("files").select("storage_path").eq("id", file_id).execute()
        if not file_result.data:
            logfire.warn("No file found", file_id=file_id)
            return pd.DataFrame()

        storage_path = file_result.data[0]["storage_path"]

        # Download the file from Supabase Storage (assumes public bucket or signed URL)
        response = requests.get(storage_path)
        if response.status_code != 200:
            logfire.error("Failed to download CSV", storage_path=storage_path, status_code=response.status_code)
            return pd.DataFrame()

        df = pd.read_csv(io.StringIO(response.text))
        print(df)

        logfire.info(
            "CSV loaded successfully",
            row_count=len(df),
            column_count=len(df.columns)
        )

        # Register DataFrame in DuckDB
        duck_connection.register("csv_data", df)
        
        print(sql_query)

        # Execute SQL query
        result_df = duck_connection.execute(sql_query).fetchdf()

        print(result_df)
        
        logfire.info(
            "SQL executed successfully",
            query=sql_query,
            result_rows=len(result_df),
            result_columns=len(result_df.columns),
            duration=time.time() - start_time
        )

        return result_df

    except Exception as e:
        logfire.error(
            "Error in get_data",
            error=str(e),
            error_type=type(e).__name__,
            duration=time.time() - start_time
        )
        return pd.DataFrame() 