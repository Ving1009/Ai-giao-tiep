// Prototype only. Do NOT import into the production tinhdiemthpt website without approval.
// Inject a server-side transport that calls your own AI proxy with its server-only auth.
export function normalizeAdmissionsInput(input) {
  if (!input || typeof input.question !== "string" || !input.question.trim())
    throw new TypeError("Missing question");
  const history = Array.isArray(input.history) ? input.history : [];
  return {
    question: input.question.trim().slice(0, 4000),
    history: history.slice(-12).filter(m =>
      m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    ).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
  };
}
export function createOwnModelAdmissionsAdapter(sendToOwnModel) {
  if (typeof sendToOwnModel !== "function") throw new TypeError("Transport must be a function");
  return async function ask(input) {
    const payload = normalizeAdmissionsInput(input);
    // Context/localSummary is intentionally NOT treated as verified admissions data.
    // Future integration must attach source-year-status metadata from trusted RAG tools.
    const data = await sendToOwnModel(payload);
    if (data?.status !== "ok" || data?.mode !== "model" || typeof data.answer !== "string")
      throw new Error("OWN_MODEL_UNAVAILABLE");
    return { answer: data.answer, provider: "own-model", model: data.model, version: data.version };
  };
}
