import { test } from "node:test";
import assert from "node:assert/strict";
import { createOwnModelAdmissionsAdapter, normalizeAdmissionsInput } from "../integrations/thpt/adapter.mjs";

test("maps existing THPT question/history without trusting context.localSummary", () => {
  const payload = normalizeAdmissionsInput({
    question: "   Mình thích ngành gì?  ",
    history: [{ role: "user", content: "CNTT" }],
    context: { localSummary: "unverified statement" }
  });
  assert.equal(payload.question, "Mình thích ngành gì?");
  assert.deepEqual(payload.history, [{ role: "user", content: "CNTT" }]);
  assert.equal(payload.context, undefined);
});
test("keeps existing THPT assistant response contract", async () => {
  const ask = createOwnModelAdmissionsAdapter(async () => ({
    status: "ok", mode: "model", answer: "Chào bạn", model: "Qwen/Qwen3-0.6B", version: "base"
  }));
  const result = await ask({ question: "Xin chào" });
  assert.equal(result.provider, "own-model");
  assert.equal(result.answer, "Chào bạn");
});
test("does not fabricate response when backend fails", async () => {
  const ask = createOwnModelAdmissionsAdapter(async () => ({ status: "offline" }));
  await assert.rejects(() => ask({ question: "Hi" }), /OWN_MODEL_UNAVAILABLE/);
});
