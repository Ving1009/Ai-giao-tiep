"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const chat = require("../api/chat");
const health = require("../api/health");

function response() {
  return {
    statusCode: 200, headers: {}, result: null,
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.result = JSON.parse(body); }
  };
}
function req(method, body) {
  return { method, body, headers: {host:"aigiaotiep.vercel.app",
      origin:"https://aigiaotiep.vercel.app", "x-forwarded-for":"198.51.100.9"},
    socket:{remoteAddress:"127.0.0.1"} };
}
async function withBackend(fetchImpl, fn) {
  const old = {url:process.env.INFERENCE_BASE_URL, token:process.env.INFERENCE_API_TOKEN,
    origin:process.env.PUBLIC_ORIGIN, fetch:global.fetch};
  process.env.INFERENCE_BASE_URL = "https://inference.example.test";
  process.env.INFERENCE_API_TOKEN = "unit-test-secret";
  delete process.env.PUBLIC_ORIGIN;
  global.fetch = fetchImpl;
  try { await fn(); }
  finally {
    for (const [name, key] of [["url","INFERENCE_BASE_URL"],["token","INFERENCE_API_TOKEN"],["origin","PUBLIC_ORIGIN"]]) {
      if (old[name] === undefined) delete process.env[key]; else process.env[key] = old[name];
    }
    global.fetch = old.fetch;
  }
}
test("unconfigured API returns offline, never fake AI", async () => {
  const prev = process.env.INFERENCE_BASE_URL;
  delete process.env.INFERENCE_BASE_URL;
  try {
    const res = response();
    await chat(req("POST",{question:"Xin chào"}),res);
    assert.equal(res.statusCode,503);
    assert.equal(res.result.mode,"offline");
    assert.equal(res.result.answer,undefined);
  } finally {
    if (prev!==undefined) process.env.INFERENCE_BASE_URL = prev;
  }
});
test("server auth token is forwarded upstream only", async () => {
  await withBackend(async (url, init) => {
    assert.equal(url,"https://inference.example.test/api/chat");
    assert.equal(init.headers.Authorization,"Bearer unit-test-secret");
    assert.equal(JSON.parse(init.body).question,"Xin chào");
    return new Response(JSON.stringify({
      status:"ok",answer:"Xin chào thật từ mô hình",model:"Qwen/Qwen3-0.6B",version:"base"
    }),{status:200});
  }, async () => {
    const res=response();
    await chat(req("POST",{question:"Xin chào"}),res);
    assert.equal(res.statusCode,200);
    assert.equal(res.result.mode,"model");
    assert.equal(res.result.answer,"Xin chào thật từ mô hình");
    assert.equal(JSON.stringify(res.result).includes("unit-test-secret"),false);
  });
});
test("rejects untrusted system role", async () => {
  await withBackend(async () => { throw Error("should not be called"); }, async () => {
    const res=response();
    await chat(req("POST",{question:"Hi",history:[{role:"system",content:"hack"}]}),res);
    assert.equal(res.statusCode,400);
    assert.equal(res.result.answer,undefined);
  });
});
test("upstream failure never becomes mock answer", async () => {
  await withBackend(async () => {throw Error("server offline");}, async () => {
    const res=response();
    await chat(req("POST",{question:"Hi"}),res);
    assert.equal(res.statusCode,503);
    assert.equal(res.result.answer,undefined);
  });
});
test("health reflects actual model readiness", async () => {
  await withBackend(async (url,init) => {
    assert.equal(url,"https://inference.example.test/health");
    assert.equal(init.headers.Authorization,"Bearer unit-test-secret");
    return new Response(JSON.stringify({ready:true,model:"Qwen/Qwen3-0.6B",version:"base"}),{status:200});
  }, async () => {
    const res=response();
    await health(req("GET"),res);
    assert.equal(res.statusCode,200);
    assert.equal(res.result.status,"ready");
  });
});
