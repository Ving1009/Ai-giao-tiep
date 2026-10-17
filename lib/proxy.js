"use strict";
// Server-side helper for Vercel functions. Secrets must never reach browser JavaScript.
const RATE_WINDOW_MS = 60_000;
const buckets = new Map();

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(value));
}
function configured() {
  const base = process.env.INFERENCE_BASE_URL;
  const token = process.env.INFERENCE_API_TOKEN;
  if (!base || !token) return null;
  try {
    const url = new URL(base);
    const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return { base: url.origin, token };
  } catch (_) { return null; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers.host;
    const expected = process.env.PUBLIC_ORIGIN;
    return expected ? new URL(origin).origin === new URL(expected).origin
      : new URL(origin).host === host;
  } catch (_) { return false; }
}
function limit(req) {
  const now = Date.now();
  if (buckets.size > 2000) for (const [key, slot] of buckets)
    if (now >= slot.resetAt) buckets.delete(key);
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0].slice(0, 64);
  const slot = buckets.get(ip);
  if (!slot || now >= slot.resetAt) {
    buckets.set(ip, { hits: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  slot.hits++;
  return slot.hits <= 12;
}
function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Dữ liệu gửi lên không hợp lệ.");
  if (typeof input.question !== "string" || !input.question.trim() || input.question.length > 4000)
    throw Error("Câu hỏi phải dài từ 1 đến 4000 ký tự.");
  if (input.history !== undefined && (!Array.isArray(input.history) || input.history.length > 12))
    throw Error("Lịch sử hội thoại không hợp lệ (tối đa 12 tin).");
  const history = (input.history || []).map(m => {
    if (!m || typeof m !== "object" || !["user", "assistant"].includes(m.role) ||
      typeof m.content !== "string" || m.content.length > 4000)
      throw Error("Tin nhắn trong lịch sử không hợp lệ.");
    return { role: m.role, content: m.content };
  });
  const options = input.options || {};
  if (typeof options !== "object" || Array.isArray(options)) throw Error("Tùy chọn không hợp lệ.");
  const max = Number.isInteger(options.max_new_tokens) ? options.max_new_tokens : 256;
  const temp = typeof options.temperature === "number" ? options.temperature : 0.7;
  if (max < 16 || max > 512 || !Number.isFinite(temp) || temp < 0.1 || temp > 1.5)
    throw Error("Thông số suy luận ngoài giới hạn.");
  return { question: input.question.trim(), history, options: { max_new_tokens: max, temperature: temp } };
}
async function upstream(config, path, method, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(config.base + path, {
      method, signal: controller.signal,
      headers: {
        Authorization: "Bearer " + config.token,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const text = await response.text();
    if (text.length > 100000) throw Error("Phản hồi quá lớn.");
    const payload = JSON.parse(text);
    return { ok: response.ok, status: response.status, payload };
  } finally { clearTimeout(timer); }
}
module.exports = { send, configured, sameOrigin, limit, validate, upstream };
