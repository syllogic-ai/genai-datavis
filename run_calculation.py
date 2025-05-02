import os
import duckdb
import requests
import pandas as pd
import tempfile
from pydantic import BaseModel, Field, ConfigDict
import asyncio
from typing import Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI setup - try to import but handle if not available
try:
    from openai import OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")
    if OPENAI_API_KEY:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        OPENAI_AVAILABLE = True
    else:
        OPENAI_AVAILABLE = False
except ImportError:
    OPENAI_AVAILABLE = False
    print("OpenAI library not available, will use hardcoded SQL query")

# Parameters
DATASET_URL = "https://ptsbrkwalysbchtdharj.supabase.co/storage/v1/object/public/test-bucket//05fngx0nah0w_1744663723995.csv"
CHAT_ID = "87939486-f970-4c1a-8b8d-85262607d47c"
REQUEST_ID = "req-1"
FILE_ID = "7fb91554-8acb-4527-8e1f-3e0fcff5efbf"
USER_PROMPT = "can you return the total power consumption per year?"

# Define the bare minimum structures needed
class SchemaColumn(BaseModel):
    name: str
    dtype: str
    null_percent: float

class DatasetProfile(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    schema_info: List[SchemaColumn] = Field(alias="schema")
    sample: List[List[Any]]

class Deps(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    chat_id: str
    request_id: str
    file_id: str
    duck: Any  # DuckDBPyConnection
    profile: DatasetProfile

class CalcInput(BaseModel):
    user_prompt: str

class CalcOutput(BaseModel):
    sql: str

# Use LLM to generate SQL
def generate_sql_with_llm(prompt: str) -> str:
    """Generate SQL using OpenAI API or fallback to hardcoded SQL"""
    
    try:
        print("Calling OpenAI API to generate SQL...")
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a SQL expert specializing in DuckDB. Generate valid DuckDB SQL queries based on user questions about data. Your response must be ONLY the SQL query with NO explanations, comments, or markdown formatting. Do not include backticks or sql tags. The table name to use is 'power_data'."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        # Extract the SQL from the response
        sql = response.choices[0].message.content.strip()
        
        # Clean up markdown formatting if present
        sql = sql.replace('```sql', '').replace('```', '').strip()
        
        # Ensure the correct table name is used
        sql = sql.replace('your_table_name', 'power_data')
        sql = sql.replace('table_name', 'power_data')
        
        # Ensure there's a semicolon at the end
        if not sql.endswith(';'):
            sql += ';'
            
        return sql
    except Exception as e:
        print(f"Error generating SQL with LLM: {e}")
        # Fallback SQL for the requested task
        return """
        SELECT 
            EXTRACT(YEAR FROM Datetime) AS year,
            SUM(AEP_MW) AS total_power_consumption
        FROM power_data
        GROUP BY year
        ORDER BY year;
        """

# Simplified version of the calculate function
async def calculate(input: CalcInput, deps: Deps) -> CalcOutput:
    """Generate SQL query based on user prompt and dataset profile."""
    # Build prompt with schema and sample data
    schema_table = "\n".join([
        f"| {col.name} | {col.dtype} | {col.null_percent}% |"
        for col in deps.profile.schema_info
    ])
    
    sample_table = "\n".join([
        "| " + " | ".join(str(val) for val in row) + " |"
        for row in deps.profile.sample
    ])
    
    prompt = f"""
Schema:
| Column | Type | Null % |
|--------|------|--------|
{schema_table}

Sample data (first 5 rows):
{sample_table}

User question: {input.user_prompt}

Generate a DuckDB SQL query to answer the question. The query should be precise and efficient. 
Return ONLY the SQL query, no explanations or comments.
"""
    
    print("Generated prompt for SQL query:")
    print(prompt)
    
    # Generate SQL with LLM
    sql = generate_sql_with_llm(prompt)
    
    return CalcOutput(sql=sql)

async def main():
    print(f"Downloading dataset from {DATASET_URL}...")
    # Download and process the dataset
    response = requests.get(DATASET_URL)
    response.raise_for_status()
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as temp_file:
        temp_file_path = temp_file.name
        temp_file.write(response.content)
    
    try:
        print(f"Creating DuckDB connection and loading data from {temp_file_path}...")
        # Create DuckDB connection and load data
        conn = duckdb.connect(database=':memory:')
        conn.execute("CREATE TABLE power_data AS SELECT * FROM read_csv_auto(?)", [temp_file_path])
        
        print("Creating dataset profile...")
        # Create dataset profile by examining the data
        df = conn.execute("SELECT * FROM power_data LIMIT 10").fetchdf()
        
        # Create schema info
        schema_cols = []
        for col_name in df.columns:
            dtype = str(df[col_name].dtype)
            schema_cols.append(SchemaColumn(
                name=col_name,
                dtype=dtype,
                null_percent=df[col_name].isna().mean() * 100
            ))
        
        # Get sample rows for display
        sample_data = [list(row) for row in df.values[:5]]
        
        # Create profile
        profile = DatasetProfile(
            schema=schema_cols,
            sample=sample_data
        )
        
        # Create dependencies
        deps = Deps(
            chat_id=CHAT_ID,
            request_id=REQUEST_ID,
            file_id=FILE_ID,
            duck=conn,
            profile=profile
        )
        
        # Create input
        input_data = CalcInput(user_prompt=USER_PROMPT)
        
        print(f"Running calculation with prompt: {USER_PROMPT}")
        # Run calculation
        result = await calculate(input_data, deps)
        print("\nGenerated SQL Query:")
        print(result.sql)
        
        # Execute the query
        print("\nExecuting query...")
        query_result = conn.execute(result.sql).fetchall()
        print("\nQuery Result:")
        
        # Determine if we're dealing with yearly data
        is_yearly_data = any(col.lower() == 'year' for col in [str(row[0]).lower() for row in query_result[:1]])
        
        # Format and display results
        if is_yearly_data:
            # Sort by year for yearly data
            sorted_results = sorted(query_result, key=lambda x: x[0])
            for row in sorted_results:
                year = row[0]
                value = row[1]
                formatted_value = f"{value:,.2f}".rstrip('0').rstrip('.') if isinstance(value, (int, float)) else value
                print(f"Year: {year}, Total Power Consumption: {formatted_value} MW")
        else:
            for row in query_result:
                # Format numbers with commas for better readability
                formatted_row = []
                for val in row:
                    if isinstance(val, (int, float)):
                        formatted_val = f"{val:,.2f}".rstrip('0').rstrip('.')
                    else:
                        formatted_val = val
                    formatted_row.append(formatted_val)
                
                if len(row) >= 2:
                    print(f"Day: {formatted_row[0]}, Power Consumption: {formatted_row[1]} MW")
                else:
                    print(formatted_row)
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    asyncio.run(main()) 