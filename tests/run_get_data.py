#!/usr/bin/env python
"""
Script to run the get_data function with real file and chart IDs.
This will fetch real data from the database.
"""

import os
import sys
import pandas as pd
from dotenv import load_dotenv

# Add the project root to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables first
load_dotenv()

# Import the get_data function
from apps.backend.app.main import get_data

def main():
    # Use the real file ID and chart ID values
    file_id = "0e708fc0-c8ff-4ab5-a77e-810d0462e765"
    chart_id = "00612de3-57f5-4c56-b5de-1ae81733c29b"
    
    print(f"Fetching data for file_id: {file_id}, chart_id: {chart_id}")
    
    try:
        # Call the get_data function
        result = get_data(file_id, chart_id)
        
        # Print information about the result
        if isinstance(result, pd.DataFrame) and not result.empty:
            print(f"Successfully fetched data:")
            print(f"Shape: {result.shape}")
            print(f"Columns: {result.columns.tolist()}")
            print("\nFirst 5 rows:")
            print(result.head(5))
        else:
            print("No data retrieved or empty DataFrame returned")
    
    except Exception as e:
        print(f"Error fetching data: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 