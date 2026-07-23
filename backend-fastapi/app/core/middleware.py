import uuid
from fastapi import Request

async def trace_id_middleware(request: Request, call_next):
    """Middleware gắn X-Request-ID (Trace ID) vào mọi request/response header."""
    trace_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4()}")
    request.state.trace_id = trace_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = trace_id
    return response
