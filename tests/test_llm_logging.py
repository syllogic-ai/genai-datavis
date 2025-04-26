"""
Tests for the LLM logging functionality in core.llm
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from pydantic import BaseModel, Field


class TestOutModel(BaseModel):
    """Test output model for LLM calls"""
    value: str = Field(...)
    confidence: float = Field(...)


@pytest.fixture
def mock_openai_chat_completion(monkeypatch):
    """Fixture to mock the openai_chat_completion function"""
    mock = AsyncMock()
    mock.return_value = MagicMock(
        model_response=TestOutModel(value="test_value", confidence=0.95),
        model="gpt-4o-mini",
        usage=MagicMock(prompt_tokens=10, completion_tokens=5),
        cost_usd=0.001
    )
    monkeypatch.setattr("apps.backend.core.llm.openai_chat_completion", mock)
    return mock


@pytest.fixture
def mock_supabase_insert(monkeypatch):
    """Fixture to mock the Supabase insert method"""
    mock_execute = MagicMock()
    mock_insert = MagicMock()
    mock_insert.return_value.execute = mock_execute
    mock_table = MagicMock()
    mock_table.insert = mock_insert
    
    mock_supabase = MagicMock()
    mock_supabase.table.return_value = mock_table
    
    monkeypatch.setattr("apps.backend.core.llm.supabase", mock_supabase)
    return mock_supabase


@pytest.mark.asyncio
async def test_llm_call_returns_model_response(mock_openai_chat_completion, mock_supabase_insert):
    """Test that llm_call returns the validated model_response"""
    from apps.backend.core.llm import llm_call
    
    # Test parameters
    system = "You are a helpful assistant"
    user = "What is the meaning of life?"
    chat_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())
    api_request = "test_request"
    
    # Call the function
    response = await llm_call(
        system=system,
        user=user,
        out_model=TestOutModel,
        chat_id=chat_id,
        request_id=request_id,
        api_request=api_request
    )
    
    # Verify the response
    assert isinstance(response.model_response, TestOutModel)
    assert response.model_response.value == "test_value"
    assert response.model_response.confidence == 0.95
    
    # Verify the mock was called with correct parameters
    mock_openai_chat_completion.assert_called_once()
    call_args = mock_openai_chat_completion.call_args[1]
    assert call_args["system"] == system
    assert call_args["user"] == user
    assert call_args["out_type"] == TestOutModel


@pytest.mark.asyncio
async def test_llm_call_logs_usage(mock_openai_chat_completion, mock_supabase_insert):
    """Test that llm_call logs usage data to the database"""
    from apps.backend.core.llm import llm_call
    
    # Test parameters
    system = "You are a helpful assistant"
    user = "What is the meaning of life?"
    chat_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())
    api_request = "test_request"
    user_id = str(uuid.uuid4())
    
    # Call the function
    await llm_call(
        system=system,
        user=user,
        out_model=TestOutModel,
        chat_id=chat_id,
        request_id=request_id,
        api_request=api_request,
        user_id=user_id
    )
    
    # Verify log was called
    mock_supabase_insert.table.assert_called_once_with("llm_usage")
    mock_supabase_insert.table.return_value.insert.assert_called_once()
    
    # Get the logged data
    logged_data = mock_supabase_insert.table.return_value.insert.call_args[0][0]
    
    # Verify the logged data contains the correct values
    assert logged_data["chat_id"] == chat_id
    assert logged_data["api_request"] == api_request
    assert logged_data["model"] == "gpt-4o-mini"
    assert logged_data["provider"] == "OpenAI"
    assert logged_data["input_tokens"] == 10
    assert logged_data["output_tokens"] == 5
    assert logged_data["total_cost"] == 0.001 