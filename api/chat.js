"use strict";
const { send, configured, sameOrigin, limit, validate, upstream } = require("./_shared");
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { status: "error", error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(req)) return send(res, 403, { status: "error", error: "ORIGIN_NOT_ALLOWED" });
  if (!limit(req)) return send(res, 429, { status: "error", error: "RATE_LIMITED", message: "Bạn gửi quá nhanh. Hãy thử lại sau." });
  const config = configured();
  if (!config) return send(res, 503, { status: "offline", mode: "offline", error: "MODEL_NOT_CONFIGURED", message: "Chưa cấu hình máy chủ mô hình AI." });
  try {
    if (Number(req.headers["content-length"] || 0) > 32 * 1024)
      return send(res, 413, { status: "error", error: "REQUEST_TOO_LARGE" });
    const input = validate(typeof req.body === "string" ? JSON.parse(req.body) : req.body);
    const result = await upstream(config, "/api/chat", "POST", input);
    if (!result.ok) return send(res, result.status >= 400 && result.status < 500 ? result.status : 503,
      { status: "error", mode: "offline", error: result.payload.error || "MODEL_UNAVAILABLE",
        message: result.payload.message || "Máy chủ AI chưa thể phản hồi." });
    if (result.payload.status !== "ok" || typeof result.payload.answer !== "string")
      throw Error("Invalid model response");
    return send(res, 200, {
      status: "ok", mode: "model",
      answer: result.payload.answer,
      model: result.payload.model, version: result.payload.version
    });
  } catch (error) {
    if (error.message?.includes("Dữ liệu") || error.message?.includes("Câu hỏi") ||
        error.message?.includes("Lịch sử") || error.message?.includes("lịch sử") ||
        error.message?.includes("Tin nhắn") || error.message?.includes("Thông số") ||
        error.message?.includes("Tùy chọn") || error instanceof SyntaxError)
      return send(res, 400, { status: "error", error: "INVALID_REQUEST", message: error.message });
    return send(res, 503, { status: "error", mode: "offline", error: "UPSTREAM_UNAVAILABLE",
      message: "Không liên lạc được máy chủ AI. Hãy thử lại sau." });
  }
};
