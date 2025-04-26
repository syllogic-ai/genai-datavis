from __future__ import annotations
import asyncio, textwrap
from typing import List

import duckdb
from ..core.llm import llm_call
from ..core.models import SQLRequest, SQLResponse

_SYSTEM_PROMPT = textwrap.dedent("""
You are an analytics SQL generator for DuckDB. 
Given the dataset profile {profile} and a user request, output **only** a valid single SELECT statement.
Do not wrap in markdown. Do not add explanations.
""")

def _validate(sql: str) -> bool:
    try:
        duckdb.sql(f"EXPLAIN {sql}")
        return True
    except Exception:
        return False

async def _one_call(req: SQLRequest) -> str:
    user_prompt = f"User request: {req.prompt}\nReturn SQL now:"
    resp: SQLResponse = await llm_call(
        system=_SYSTEM_PROMPT.format(profile=req.profile.model_dump_json()),
        user=user_prompt,
        out_model=SQLResponse,
        chat_id="N/A",
        api_request="/generate_sql",
        request_id="N/A",
    )
    return resp.sql.strip().rstrip(";")

async def generate_sql(req: SQLRequest) -> SQLResponse:
    """
    Call GPT-4o-mini three times in parallel, validate with DuckDB EXPLAIN,
    return first duplicate or first valid statement.
    """
    coros = [_one_call(req) for _ in range(3)]
    candidates: List[str] = await asyncio.gather(*coros, return_exceptions=False)

    # find duplicate
    for i, sql_i in enumerate(candidates):
        for sql_j in candidates[i + 1 :]:
            if sql_i.lower() == sql_j.lower() and _validate(sql_i):
                return SQLResponse(sql=sql_i)
    # fallback: first valid
    for sql in candidates:
        if _validate(sql):
            return SQLResponse(sql=sql)
    # if all invalid
    raise ValueError("All generated SQL statements were invalid") 