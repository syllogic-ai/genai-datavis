import pytest
from unittest.mock import Mock, patch
from typing import Union
from apps.backend.core.models import LLMUsageRow
from apps.backend.utils.logging import _log_llm

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
