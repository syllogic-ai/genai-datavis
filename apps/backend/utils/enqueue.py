import rq
from ..core.config import upstash_connection
from ..workers.rq_worker import process_prompt

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
    """
    _q.enqueue(
        process_prompt,
        request_id=request_id,
        csv_url=csv_url,
        prompt=prompt,
        chat_id=chat_id,
        user_id=user_id,
        job_id=request_id,   # same ID for easier tracing
        ttl=900,
        result_ttl=0,
    ) 