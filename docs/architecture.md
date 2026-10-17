# Kiến trúc — AI giao tiếp tiếng Việt

Trạng thái: ĐÃ VIẾT MÃ NGUỒN, CHƯA CÓ XÁC NHẬN MÔ HÌNH LIVE.

Browser (HTML/CSS/JS) -> Vercel same-origin POST /api/chat -> authenticated HTTPS
-> FastAPI inference host POST /api/chat -> Transformers + optional PEFT adapter -> tokens.
Browser GET /api/health -> Vercel GET /api/health -> authenticated FastAPI GET /health.

- Vercel handles static UI and safe API proxy only; no training or model weights.
- FastAPI holds weights. On startup, it loads Qwen/Qwen3-0.6B; optional adapter
  MODEL_ADAPTER_PATH changes model version without changing frontend.
- The same MODEL_API_TOKEN / INFERENCE_API_TOKEN authenticates server-to-server traffic.
  Never put either token in app.js or in public environment vars.
- Memory: at most 12 user/assistant messages passed from browser history.
  Current conversations are stored only in browser localStorage.
  Production should add opt-in and disclosure before syncing with a server.
- Qwen3 non-thinking chat template prevents large reasoning output.
- Error conditions do NOT fall back to scripted mock, paid APIs, ChatGPT, Gemini, Groq.
- Inference backend never evaluates code from user messages.
- Accuracy: model responses are untrusted text until validated against sources.
  Score calculations belong in deterministic tools, never model weights.

## Boundaries and risks

- In-memory rate limits reset when serverless instances restart and are NOT a globally
  enforced quota. Add WAF / Redis / Cloudflare shared counters before public scale.
- GPU hosting and HTTPS inference endpoint are external dependencies; no provisioned GPU
  means /api/health must show offline and /api/chat returns 503.
- Server model generation may still run after client abort or timeout (Python thread cannot
  be forcibly interrupted). Enforce worker-level concurrency and request budgets in production.
- Streaming and citations-based RAG are NOT yet implemented.
- Dataset samples are unreviewed, model fine-tuning unperformed.
