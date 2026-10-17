"""FastAPI inference backend. Never deploy this inside a Vercel Function."""
import asyncio
import hmac
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

try:
    from .model_loader import engine
    from .schemas import ChatRequest, ChatResponse
except ImportError:
    from model_loader import engine
    from schemas import ChatRequest, ChatResponse

app = FastAPI(title="AI Giao Tiep Inference", version="0.1.0", docs_url=None, redoc_url=None)
hits = defaultdict(deque)
hits_lock = threading.Lock()

def authenticate(authorization: str | None = Header(default=None)):
    secret = os.getenv("MODEL_API_TOKEN")
    if not secret or not authorization or not hmac.compare_digest(authorization, "Bearer " + secret):
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")

def check_rate_limit(request: Request):
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with hits_lock:
        if len(hits) > 5000:
            for key in list(hits):
                if not hits[key] or hits[key][-1] <= now - 60:
                    del hits[key]
        bucket = hits[address]
        while bucket and bucket[0] <= now - 60:
            bucket.popleft()
        if len(bucket) >= 30:
            raise HTTPException(status_code=429, detail="RATE_LIMITED")
        bucket.append(now)

@app.on_event("startup")
async def startup():
    if os.getenv("MODEL_LOAD_ON_STARTUP", "1") == "1":
        try:
            await asyncio.to_thread(engine.load)
        except Exception:
            # Health responds 503; startup must not pretend model is ready.
            pass

@app.get("/health", dependencies=[Depends(authenticate)])
def health():
    return JSONResponse(
        status_code=200 if engine.ready else 503,
        content={"ready": engine.ready, "model": engine.model_id, "version": engine.version,
                 "status": "ready" if engine.ready else "offline"}
    )

@app.post("/api/chat", response_model=ChatResponse, dependencies=[Depends(authenticate)])
async def chat(payload: ChatRequest, request: Request):
    check_rate_limit(request)
    # The server can serialize single-GPU generation; timeouts may leave the underlying worker running.
    try:
        answer = await asyncio.wait_for(
            asyncio.to_thread(engine.generate, payload.question, payload.history, payload.options),
            timeout=40.0
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="GENERATION_TIMEOUT")
    except ValueError as exc:
        if str(exc) == "CONTEXT_TOO_LONG":
            raise HTTPException(status_code=413, detail="CONTEXT_TOO_LONG")
        raise HTTPException(status_code=400, detail="INVALID_INPUT")
    except Exception:
        raise HTTPException(status_code=503, detail="MODEL_UNAVAILABLE")
    return ChatResponse(answer=answer, model=engine.model_id, version=engine.version)
