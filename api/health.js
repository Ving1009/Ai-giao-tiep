"use strict";
const { send, configured, sameOrigin, upstream } = require("./_shared");
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { status: "error", error: "METHOD_NOT_ALLOWED" });
  if (!sameOrigin(req)) return send(res, 403, { status: "error", error: "ORIGIN_NOT_ALLOWED" });
  const config = configured();
  if (!config) return send(res, 503, { status: "offline", mode: "offline", model: null,
    error: "MODEL_NOT_CONFIGURED", message: "Chưa kết nối máy chủ mô hình." });
  try {
    const result = await upstream(config, "/health", "GET");
    return send(res, result.ok && result.payload.ready === true ? 200 : 503, {
      status: result.ok && result.payload.ready === true ? "ready" : "offline",
      mode: result.ok && result.payload.ready === true ? "model" : "offline",
      model: result.payload.model || null, version: result.payload.version || null,
      message: result.ok && result.payload.ready === true ? "Mô hình đã sẵn sàng." : "Mô hình chưa sẵn sàng."
    });
  } catch (_) {
    return send(res, 503, { status: "offline", mode: "offline", model: null,
      error: "UPSTREAM_UNAVAILABLE", message: "Máy chủ AI không phản hồi." });
  }
};
