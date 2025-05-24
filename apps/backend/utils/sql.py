import duckdb
import polars as pl

from ..core.config import supabase
# SQL validation
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

# SQL execution
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