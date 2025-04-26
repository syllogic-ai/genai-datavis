import pytest, asyncio
from unittest.mock import patch, AsyncMock
from apps.backend.services.sql_llm import generate_sql
from apps.backend.core.models import SQLRequest, DatasetProfile, SQLResponse

@pytest.mark.asyncio
@patch("apps.backend.services.sql_llm.llm_call", new_callable=AsyncMock)
@patch("apps.backend.services.sql_llm.duckdb")
async def test_generate_sql_majority(mock_duck, mock_llm):
    profile = DatasetProfile(columns=["a"], dtypes=["INTEGER"], null_pct=[0.0], sample=[[1]])
    req = SQLRequest(prompt="sum a", profile=profile)

    # mock three calls: two identical
    mock_llm.side_effect = [
        SQLResponse(sql="SELECT sum(a) FROM v"),
        SQLResponse(sql="SELECT sum(a) FROM v"),
        SQLResponse(sql="SELECT 1")
    ]
    mock_duck.sql.return_value = None  # EXPLAIN passes
    result = await generate_sql(req)
    assert result.sql.lower().startswith("select sum") 