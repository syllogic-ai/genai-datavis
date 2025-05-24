import sys
import os
import ssl

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath('..'))

# Create an unverified SSL context (use with caution)
# This is not recommended for production use, but helpful for testing
ssl._create_default_https_context = ssl._create_unverified_context

from apps.backend.utils.files import extract_schema_sample, DATA_BUCKET
from apps.backend.core.config import supabase

def main():
    
    try:
        file_id = "7fb91554-8acb-4527-8e1f-3e0fcff5efbf"
        result = extract_schema_sample(file_id)
        print("\nExtraction successful!")
        print("\nDataset Profile:")
        print(f"  Columns: {result.columns}")
        print("\nSample data:")
        for i, row in enumerate(result.sample_rows):
            print(f"  Row {i+1}: {row}")
    except Exception as e:
        print(f"Error extracting schema: {e}")
        import traceback
        traceback.print_exc()
            
  

if __name__ == "__main__":
    main() 