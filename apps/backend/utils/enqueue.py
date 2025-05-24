import rq
from core.config import upstash_connection
import asyncio

# Async wrapper for process_prompt
def _run_async_process_prompt(*args, **kwargs):
    """
    Run the async process_prompt function using asyncio.
    This wrapper allows the async function to be called from a synchronous context.
    """
    from workers.rq_worker import process_prompt
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(process_prompt(**kwargs))
    finally:
        loop.close()

_q = rq.Queue("prompts", connection=upstash_connection())

def enqueue_prompt(
    *,
    request_id: str,
    csv_url: str,
    prompt: str,
    chat_id: str,
    user_id: str | None,
) -> None:
    """
    Fire-and-forget enqueue; returns immediately.
    Handles asynchronous process_prompt function through a synchronous wrapper.
    """
    _q.enqueue(
        _run_async_process_prompt,
        request_id=request_id,
        csv_url=csv_url,
        prompt=prompt,
        chat_id=chat_id,
        user_id=user_id,
        job_id=request_id,   # same ID for easier tracing
        ttl=900,
        result_ttl=0,
    ) 