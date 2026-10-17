"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validate, configured, sameOrigin } = require("../lib/proxy");
test("accepts valid conversation", () => {
  const v = validate({ question: "Xin chào", history: [{role: "user", content: "Chào"}] });
  assert.equal(v.history.length, 1);
  assert.equal(v.options.max_new_tokens, 256);
});
test("rejects script role, excessive history and empty messages", () => {
  assert.throws(() => validate({ question: "Hello", history: [{role: "system", content:"evil"}] }));
  assert.throws(() => validate({ question: " " }));
  assert.throws(() => validate({ question: "test", history: Array(13).fill({role:"user",content:"a"}) }));
});
test("honors same-site origin", () => {
  assert.equal(sameOrigin({headers:{host:"aigiaotiep.vercel.app",origin:"https://aigiaotiep.vercel.app"}}), true);
  assert.equal(sameOrigin({headers:{host:"aigiaotiep.vercel.app",origin:"https://evil.example"}}), false);
});
test("missing inference env is offline", () => {
  const old = process.env.INFERENCE_BASE_URL;
  delete process.env.INFERENCE_BASE_URL;
  assert.equal(configured(), null);
  if (old !== undefined) process.env.INFERENCE_BASE_URL = old;
});
