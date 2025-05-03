"""
Test script to run the calculate function with hardcoded input and context.
This allows testing the SQL generation functionality without setting up a full API request.
"""

import asyncio
import duckdb
import uuid
import sys
from pydantic_ai import RunContext

from apps.backend.tools.calculate import calculate, CalcInput, Deps

async def main():
    # Create a DuckDB connection
    duck_conn = duckdb.connect(":memory:")
    
    # Generate a unique request ID
    request_id = str(uuid.uuid4())
    
    # Hardcoded values for testing
    chat_id = "test-chat-id"
    # Use a real file ID found in the test files
    file_id = "20ef3110-0a18-42b4-b190-a720e733d25b"
    
    # Allow for command line override of file_id
    if len(sys.argv) > 1:
        file_id = sys.argv[1]
    
    print(f"Using file_id: {file_id}")
    
    # Create the dependencies
    deps = Deps(
        chat_id=chat_id,
        request_id=request_id,
        file_id=file_id,
        duck=duck_conn
    )
    
    # Create the run context with our dependencies
    ctx = RunContext(deps=deps)
    
    # Create the input with a user prompt
    user_prompt = "Which day did we have the most sales and how much was it?"
    input_data = CalcInput(user_prompt=user_prompt)
    
    try:
        # Run the calculate function
        result = await calculate(input=input_data, ctx=ctx)
        
        # Print the result
        print("\n===== GENERATED SQL =====")
        print(result.sql)
        print("========================\n")
        
        # Optionally, try to execute the SQL to verify it works
        try:
            duck_conn.execute(result.sql)
            print("SQL executed successfully!")
            print("Results:")
            print(duck_conn.fetchall())
        except Exception as e:
            print(f"Error executing SQL: {e}")
    except Exception as e:
        print(f"Error running calculate function: {e}")
    finally:
        # Close the DuckDB connection
        duck_conn.close()

if __name__ == "__main__":
    asyncio.run(main()) 