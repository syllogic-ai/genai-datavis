"""
Component testing script for the GenAI DataVis application.
This script allows for step-by-step testing of different components.
"""

import os
import sys
import json
import pandas as pd
import asyncio
from dotenv import load_dotenv

# Add the backend directory to the path for imports
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "apps/backend")
sys.path.append(backend_path)

# Try to load environment variables from .env.local first, then fallback to .env
if os.path.exists("apps/backend/.env.local"):
    load_dotenv("apps/backend/.env.local")
    print("Loaded environment variables from apps/backend/.env.local")
else:
    load_dotenv("apps/backend/.env")
    print("Loaded environment variables from apps/backend/.env")

# Test LLM connection
def test_llm_connection():
    """Test the connection to the LLM."""
    print("\n=== Testing LLM Connection ===")
    
    try:
        from core.llm import get_openai_client
        client = get_openai_client()
        
        # Simple test completion
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": "Say 'LLM connection successful'"}],
            max_tokens=10
        )
        
        result = response.choices[0].message.content.strip()
        print(f"LLM Response: {result}")
        print("✅ LLM connection successful")
        return True
    except Exception as e:
        print(f"❌ LLM connection failed: {str(e)}")
        return False

# Test Supabase connection
def test_supabase_connection():
    """Test the connection to Supabase."""
    print("\n=== Testing Supabase Connection ===")
    
    try:
        from core.config import supabase
        
        # Simple test query to check connection
        response = supabase.table("chats").select("id").limit(1).execute()
        
        print(f"Supabase Response: {response}")
        print("✅ Supabase connection successful")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {str(e)}")
        return False

# Monkey patch the imports in the insights service
def patch_insights_module():
    """Monkey patch the insights module to fix imports."""
    import sys
    from importlib.machinery import SourceFileLoader
    from importlib.util import spec_from_loader, module_from_spec
    
    # Create a custom loader that substitutes relative imports
    insights_path = os.path.join(backend_path, "services", "insights.py")
    loader = SourceFileLoader("services.insights", insights_path)
    spec = spec_from_loader("services.insights", loader)
    insights_module = module_from_spec(spec)
    
    # Add dependencies to the module
    import core.config
    import core.models
    insights_module.core = core
    
    # Execute the module with our patched imports
    loader.exec_module(insights_module)
    sys.modules["services.insights"] = insights_module
    return insights_module

# Monkey patch the imports in the charts service
def patch_charts_module():
    """Monkey patch the charts module to fix imports."""
    import sys
    from importlib.machinery import SourceFileLoader
    from importlib.util import spec_from_loader, module_from_spec
    
    # Create a custom loader that substitutes relative imports
    charts_path = os.path.join(backend_path, "services", "charts.py")
    loader = SourceFileLoader("services.charts", charts_path)
    spec = spec_from_loader("services.charts", loader)
    charts_module = module_from_spec(spec)
    
    # Add dependencies to the module
    import core.config
    import core.models
    charts_module.core = core
    
    # Execute the module with our patched imports
    loader.exec_module(charts_module)
    sys.modules["services.charts"] = charts_module
    return charts_module

# Monkey patch the imports in the sql service
def patch_sql_module():
    """Monkey patch the sql module to fix imports."""
    import sys
    from importlib.machinery import SourceFileLoader
    from importlib.util import spec_from_loader, module_from_spec
    
    # Create a custom loader that substitutes relative imports
    sql_path = os.path.join(backend_path, "services", "sql.py")
    loader = SourceFileLoader("services.sql", sql_path)
    spec = spec_from_loader("services.sql", loader)
    sql_module = module_from_spec(spec)
    
    # Add dependencies to the module
    import core.config
    import core.models
    sql_module.core = core
    
    # Execute the module with our patched imports
    loader.exec_module(sql_module)
    sys.modules["services.sql"] = sql_module
    return sql_module

# Test insights service
async def test_insights_service():
    """Test the insights generation service."""
    print("\n=== Testing Insights Service ===")
    
    try:
        # Patch imports in the insights module
        insights_module = patch_insights_module()
        generate_insights = insights_module.generate_insights
        
        # Create a simple test dataframe
        df = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023],
            'Sales': [100, 120, 150, 180],
            'Expenses': [80, 90, 100, 120]
        })
        
        # Convert pandas to polars if needed
        try:
            import polars as pl
            df = pl.from_pandas(df)
        except Exception as e:
            print(f"Warning: Could not convert to polars: {str(e)}")
        
        # Call the insights service
        result = await generate_insights(
            df=df, 
            prompt="What is the trend in sales over the years?",
            chat_id="test_chat",
            request_id="test_request"
        )
        
        print(f"Insights Result: {result}")
        print("✅ Insights service test successful")
        return True
    except Exception as e:
        print(f"❌ Insights service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Test chart service
async def test_chart_service():
    """Test the chart generation service."""
    print("\n=== Testing Chart Service ===")
    
    try:
        # Patch imports in the charts module
        charts_module = patch_charts_module()
        generate_chart_spec = charts_module.generate_chart_spec
        
        # Create a simple test dataframe
        df = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023],
            'Sales': [100, 120, 150, 180],
            'Expenses': [80, 90, 100, 120]
        })
        
        # Convert pandas to polars if needed
        try:
            import polars as pl
            df = pl.from_pandas(df)
        except Exception as e:
            print(f"Warning: Could not convert to polars: {str(e)}")
        
        # Call the chart service
        result = await generate_chart_spec(
            df=df, 
            prompt="Create a line chart showing sales over time",
            chat_id="test_chat",
            request_id="test_request"
        )
        
        print(f"Chart Spec Result: {json.dumps(result.dict(), indent=2)}")
        print("✅ Chart service test successful")
        return True
    except Exception as e:
        print(f"❌ Chart service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Test SQL service
async def test_sql_service():
    """Test the SQL execution service."""
    print("\n=== Testing SQL Service ===")
    
    try:
        # Patch imports in the sql module
        sql_module = patch_sql_module()
        execute_sql_query = sql_module.execute_sql_query
        
        # Create a simple test dataframe
        df = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023],
            'Sales': [100, 120, 150, 180],
            'Expenses': [80, 90, 100, 120],
            'Profit': [20, 30, 50, 60]
        })
        
        # Convert pandas to polars if needed
        try:
            import polars as pl
            df = pl.from_pandas(df)
        except Exception as e:
            print(f"Warning: Could not convert to polars: {str(e)}")
        
        # Execute a simple SQL query
        query = "SELECT Year, Sales, Profit, (Profit / Sales * 100) as ProfitMargin FROM data ORDER BY Year"
        result = await execute_sql_query(df, query)
        
        print(f"SQL Query Result: {result}")
        print("✅ SQL service test successful")
        return True
    except Exception as e:
        print(f"❌ SQL service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Test agentic flow
async def test_agentic_flow():
    """Test the complete agentic flow."""
    print("\n=== Testing Agentic Flow ===")
    
    try:
        from core.ai_agent import execute_flexible_agentic_flow, initialize_tools
        
        # Initialize tools
        initialize_tools()
        
        # Create a simple test dataframe
        df = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023],
            'Sales': [100, 120, 150, 180],
            'Expenses': [80, 90, 100, 120],
            'Profit': [20, 30, 50, 60]
        })
        
        # Convert pandas to polars if needed
        try:
            import polars as pl
            df = pl.from_pandas(df)
        except Exception as e:
            print(f"Warning: Could not convert to polars: {str(e)}")
        
        # Execute the agentic flow
        result = await execute_flexible_agentic_flow(
            df=df,
            user_query="Show me the trend in sales and profit over time",
            chat_id="test_chat",
            user_id="test_user"
        )
        
        print(f"Agentic Flow Result: {json.dumps(result, indent=2)}")
        print("✅ Agentic flow test successful")
        return True
    except Exception as e:
        print(f"❌ Agentic flow test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Wrapper functions to run async tests
def run_test_insights_service():
    return asyncio.run(test_insights_service())

def run_test_chart_service():
    return asyncio.run(test_chart_service())

def run_test_sql_service():
    return asyncio.run(test_sql_service())

def run_test_agentic_flow():
    return asyncio.run(test_agentic_flow())

def main():
    """Main test driver."""
    print("=== GenAI DataVis Component Testing ===")
    
    # Ask which test to run
    print("\nAvailable tests:")
    print("1. Test LLM Connection")
    print("2. Test Supabase Connection")
    print("3. Test Insights Service")
    print("4. Test Chart Service")
    print("5. Test SQL Service")
    print("6. Test Complete Agentic Flow")
    print("7. Run All Tests")
    
    choice = input("\nEnter test number (1-7): ")
    
    if choice == '1':
        test_llm_connection()
    elif choice == '2':
        test_supabase_connection()
    elif choice == '3':
        run_test_insights_service()
    elif choice == '4':
        run_test_chart_service()
    elif choice == '5':
        run_test_sql_service()
    elif choice == '6':
        run_test_agentic_flow()
    elif choice == '7':
        # Run all tests in sequence
        llm_ok = test_llm_connection()
        supabase_ok = test_supabase_connection()
        
        if not llm_ok or not supabase_ok:
            print("\n⚠️ External service issues detected. Some tests may fail.")
            proceed = input("Do you want to continue anyway? (y/n): ")
            if proceed.lower() != 'y':
                return
        
        run_test_insights_service()
        run_test_chart_service()
        run_test_sql_service()
        run_test_agentic_flow()
    else:
        print("Invalid choice. Please run again and select a valid option.")

if __name__ == "__main__":
    main() 