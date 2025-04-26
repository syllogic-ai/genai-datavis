import pytest
from unittest.mock import patch
from apps.backend.utils.enqueue import enqueue_prompt

@patch("apps.backend.utils.enqueue._q")
def test_enqueue_propagates_id(mock_q):
    enqueue_prompt(
        request_id="req-42",
        csv_url="https://x/y.csv",
        prompt="hi",
        chat_id="chat1",
        user_id="u123",
    )
    assert mock_q.enqueue.call_args.kwargs["request_id"] == "req-42"
    assert mock_q.enqueue.call_args.kwargs["job_id"] == "req-42" 