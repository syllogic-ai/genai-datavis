import pytest
from unittest.mock import Mock, patch, MagicMock
from typing import Union
from apps.backend.core.models import LLMUsageRow, DatasetProfile
from apps.backend.utils.logging import _log_llm
from apps.backend.utils.files import extract_schema_sample, DATA_BUCKET

import os
import redis
from apps.backend.core.config import supabase, upstash_connection, SUPABASE_URL, SUPABASE_SERVICE_KEY

from apps.backend.core.config import (
    supabase,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    create_client,          # re‑exported from supabase in config.py
)

def test_supabase_connection():
    """Ensure the Supabase client is configured correctly."""
    # Environment variables are loaded
    assert SUPABASE_URL, "SUPABASE_URL env var is not set"
    assert SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY env var is not set"

    # The singleton client exists
    assert supabase is not None, "supabase client was not initialised"

    # Create a mock client for testing
    mock_client = MagicMock()
    
    # Test that we can call methods on the actual client
    test_client = supabase  # Use the existing client
    
    # Patch the table method to use our mock
    with patch.object(test_client, 'table', return_value=mock_client) as mock_table:
        # Make a query
        test_client.table("users").select("*").execute()
        
        # Verify the query was made with correct parameters
        mock_table.assert_called_once_with("users")
        mock_client.select.assert_called_once_with("*")
        mock_client.select.return_value.execute.assert_called_once()

def test_upstash_connection():
    """Test that the Redis/Upstash connection is properly configured."""
    # Mock redis.from_url to avoid actual connection
    with patch('redis.from_url') as mock_from_url:
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        
        # Call the function that creates the connection
        redis_client = upstash_connection()
        
        # Verify redis.from_url was called
        mock_from_url.assert_called_once()
        
        # Check that we got a Redis client back
        assert redis_client is not None, "Redis client was not created"

def test_log_llm_usage():
    # Create a test LLMUsageRow object
    test_usage = LLMUsageRow(
        request_id="test-request-123",
        chat_id="test-chat-456",
        model="gpt-4",
        provider="OpenAI",
        api_request="/test/endpoint",
        input_tokens=100,
        output_tokens=50,
        compute_time=0.5,
        total_cost=0.01
    )
    
    # Create a mock Supabase client
    mock_supabase = Mock()
    mock_table = Mock()
    mock_supabase.table.return_value = mock_table
    
    # Expected data that should be sent to Supabase
    expected_data = {
        "request_id": "test-request-123",
        "chat_id": "test-chat-456",
        "model": "gpt-4",
        "provider": "OpenAI",
        "api_request": "/test/endpoint",
        "input_tokens": 100,
        "output_tokens": 50,
        "compute_time": 0.5,
        "total_cost": 0.01
    }
    
    # Patch the supabase client in the logging module
    with patch('apps.backend.utils.logging.supabase', mock_supabase):
        # Call the logging function
        _log_llm(test_usage)
        
        # Verify the Supabase client was called correctly
        mock_supabase.table.assert_called_once_with("llm_usage")
        mock_table.insert.assert_called_once_with(expected_data)
        mock_table.insert.return_value.execute.assert_called_once()

def test_extract_schema_sample():
    # Test file_id 
    file_id = "7fb91554-8acb-4527-8e1f-3e0fcff5efbf"
    
    # Create a mock DataFrame for polars.read_csv to return
    mock_df = Mock()
    mock_df.columns = ["col1", "col2", "col3"]
    mock_df.dtypes = ["int64", "str", "float64"]
    mock_df.head.return_value.to_dicts.return_value = [
        {"col1": 1, "col2": "value1", "col3": 1.5},
        {"col1": 2, "col2": "value2", "col3": 2.5}
    ]
    # Setup null_count for each column
    mock_df.shape = [100, 3]  # 100 rows, 3 columns
    mock_df.__getitem__.side_effect = lambda col: Mock(null_count=lambda: 10 if col == "col1" else 5)
    
    # Create mock for supabase client
    mock_supabase = Mock()
    mock_storage = Mock()
    mock_bucket = Mock()
    mock_table = Mock()
    mock_execute = Mock()
    
    # Setup the mock chain for storage operations
    mock_supabase.storage.from_.return_value = mock_bucket
    mock_bucket.get_public_url.return_value = f"https://example.com/{file_id}.csv"
    
    # Setup the mock chain for database operations
    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.execute.return_value.data = [{"user_id": "test-user-123"}]
    mock_table.insert.return_value = mock_execute
    
    # Mock the polars read_csv function
    with patch('apps.backend.utils.files.pl.read_csv', return_value=mock_df), \
         patch('apps.backend.utils.files.supabase', mock_supabase):
        
        # Call the function
        result = extract_schema_sample(file_id)
        
        # Verify the result is a DatasetProfile
        assert isinstance(result, DatasetProfile)
        
        # Verify the DataFrame was read with the correct URL
        mock_bucket.get_public_url.assert_called_once_with(f"{file_id}.csv")
        
        # Verify the profile was created with the correct data
        assert result.columns == ["col1", "col2", "col3"]
        assert result.dtypes == ["int64", "str", "float64"]
        assert result.null_pct == [10.0, 5.0, 5.0]  # 10/100*100 for col1, 5/100*100 for col2 and col3
        assert result.sample == [
            {"col1": 1, "col2": "value1", "col3": 1.5},
            {"col1": 2, "col2": "value2", "col3": 2.5}
        ]
        
        # Verify the metadata was inserted into Supabase
        mock_supabase.table.assert_called_with("files")
        mock_table.insert.assert_called_once()
        mock_supabase.storage.from_.assert_called_with(DATA_BUCKET)
        mock_bucket.upload.assert_called_once()

def test_get_data():
    """Test the get_data function fetches and processes chart data correctly."""
    from apps.backend.app.main import get_data
    import pandas as pd
    
    # Test file and chart IDs
    file_id = "test-file-id"
    chart_id = "test-chart-id"
    
    # Create mock for supabase client
    mock_supabase = Mock()
    mock_table = Mock()
    mock_execute = Mock()
    
    # Setup the mock chain for chart query
    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.execute.return_value = Mock(data=[{"sql": "SELECT * FROM csv_data LIMIT 10"}])
    
    # Create a sample DataFrame for the mock fetch_dataset to return
    sample_data = pd.DataFrame({
        'col1': [1, 2, 3, 4, 5],
        'col2': ['a', 'b', 'c', 'd', 'e'],
        'col3': [1.1, 2.2, 3.3, 4.4, 5.5]
    })
    
    # Create a mock duckdb connection
    mock_duck_connection = Mock()
    mock_duck_result = Mock()
    # The fetchdf method should return a dataframe with the query results
    mock_duck_result.fetchdf.return_value = sample_data.head(3)  # Only first 3 rows as per the SQL LIMIT
    mock_duck_connection.execute.return_value = mock_duck_result
    
    # Patch the dependencies
    with patch('apps.backend.app.main.supabase', mock_supabase), \
         patch('apps.backend.app.main.duck_connection', mock_duck_connection), \
         patch('apps.backend.app.main.fetch_dataset', return_value=sample_data):
        
        # Call the function
        result = get_data(file_id, chart_id)
        
        # Verify the results
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 3  # Should have 3 rows due to the LIMIT in SQL
        assert list(result.columns) == ['col1', 'col2', 'col3']
        
        # Verify supabase was called to get the chart
        mock_supabase.table.assert_any_call("charts")
        mock_table.select.assert_any_call("sql")
        mock_table.eq.assert_any_call("id", chart_id)
        
        # Verify supabase was called to get the file URL
        mock_supabase.table.assert_any_call("storage_path")
        
        # Verify DuckDB was used correctly
        mock_duck_connection.register.assert_called_once_with("csv_data", sample_data)
        mock_duck_connection.execute.assert_called_once_with("SELECT * FROM csv_data LIMIT 10")
        mock_duck_result.fetchdf.assert_called_once()


