import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { TokenClient } from "./TokenClient.js";
import { TokenError } from "./errors/TokenError.js";

/** 记录请求的 stub fetch：按 path 返回固定响应。 */
function makeFetch(handler: (path: string, init?: RequestInit) => { status: number; body: unknown }) {
  const calls: { path: string; method: string; headers: Record<string, string>; body?: unknown }[] = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    let body: unknown;
    if (init?.body) {
      try {
        body = JSON.parse(String(init.body));
      } catch {
        body = init.body;
      }
    }
    calls.push({ path, method: init?.method ?? "GET", headers, body });
    const { status, body: respBody } = handler(path, init);
    return new Response(JSON.stringify(respBody), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetchImpl, calls };
}

const USAGE = {
  user_id: 7,
  input_tokens: 8000,
  output_tokens: 2000,
  total_tokens: 10000,
  request_count: 3,
  today_input_tokens: 8000,
  today_output_tokens: 2000,
  today_total_tokens: 10000,
  today_request_count: 3,
  month_total_tokens: 10000,
  updated_at: "2026-09-21T12:00:00.000Z",
};

const QUOTA = { per_request_limit: 15000, daily_limit: 100000, monthly_limit: null };

describe("TokenClient", () => {
  test("check：POST /check，带 Bearer + 内部密钥，映射 snake→camel", async () => {
    const { fetchImpl, calls } = makeFetch(() => ({
      status: 200,
      body: { allowed: true, reason: null, usage: USAGE, quota: QUOTA },
    }));
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      internalKeyProvider: () => "sek",
      fetchImpl,
    });

    const r = await client.check(1000);
    assert.equal(r.allowed, true);
    assert.equal(r.usage.userId, 7);
    assert.equal(r.usage.totalTokens, 10000);
    assert.equal(r.usage.todayTotalTokens, 10000);
    assert.equal(r.usage.monthTotalTokens, 10000);
    assert.equal(r.quota.perRequestLimit, 15000);
    assert.equal(r.quota.dailyLimit, 100000);

    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.path, "/api/v1/token/check");
    assert.equal(calls[0]?.headers["Authorization"], "Bearer jwt");
    assert.equal(calls[0]?.headers["X-Token-Internal-Key"], "sek");
    assert.deepEqual(calls[0]?.body, { estimated_tokens: 1000 });
  });

  test("check：allowed=false 透传 reason", async () => {
    const { fetchImpl } = makeFetch(() => ({
      status: 200,
      body: { allowed: false, reason: "daily_limit_exceeded", usage: USAGE, quota: QUOTA },
    }));
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      internalKeyProvider: () => "sek",
      fetchImpl,
    });
    const r = await client.check();
    assert.equal(r.allowed, false);
    assert.equal(r.reason, "daily_limit_exceeded");
  });

  test("consume：input/output→snake，回包映射", async () => {
    const { fetchImpl, calls } = makeFetch(() => ({
      status: 200,
      body: { usage: USAGE, quota: QUOTA, over_limit: false },
    }));
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      internalKeyProvider: () => "sek",
      fetchImpl,
    });
    const r = await client.consume({ inputTokens: 8000, outputTokens: 2000, model: "deepseek", provider: "ds" });
    assert.equal(r.overLimit, false);
    assert.equal(r.usage.totalTokens, 10000);
    assert.deepEqual(calls[0]?.body, {
      input_tokens: 8000,
      output_tokens: 2000,
      model: "deepseek",
      provider: "ds",
    });
  });

  test("getUsage / getQuota / getRemaining：GET 路径与映射", async () => {
    const { fetchImpl, calls } = makeFetch((path) => {
      if (path === "/api/v1/token/usage") return { status: 200, body: { usage: USAGE } };
      if (path === "/api/v1/token/quota") return { status: 200, body: { quota: QUOTA } };
      return {
        status: 200,
        body: { per_request_limit: 15000, daily_limit: 100000, daily_used: 10000, daily_remaining: 90000 },
      };
    });
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      fetchImpl,
    });
    const usage = await client.getUsage();
    assert.equal(usage.userId, 7);
    assert.equal(usage.totalTokens, 10000);

    const quota = await client.getQuota();
    assert.equal(quota.dailyLimit, 100000);

    const rem = await client.getRemaining();
    assert.equal(rem.dailyUsed, 10000);
    assert.equal(rem.dailyRemaining, 90000);

    assert.deepEqual(calls.map((c) => c.method), ["GET", "GET", "GET"]);
  });

  test("无 token → auth 错误且不发请求", async () => {
    let hit = 0;
    const { fetchImpl } = makeFetch(() => {
      hit++;
      return { status: 200, body: {} };
    });
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => null,
      fetchImpl,
    });
    await assert.rejects(client.getUsage(), (err: unknown) => {
      assert.ok(err instanceof TokenError);
      assert.equal((err as TokenError).kind, "auth");
      return true;
    });
    assert.equal(hit, 0);
  });

  test("HTTP 403 → auth 错误", async () => {
    const { fetchImpl } = makeFetch(() => ({ status: 403, body: { detail: "写端点仅限内部服务调用" } }));
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      internalKeyProvider: () => "wrong",
      fetchImpl,
    });
    await assert.rejects(client.check(), (err: unknown) => {
      assert.ok(err instanceof TokenError);
      assert.equal((err as TokenError).kind, "auth");
      assert.equal((err as TokenError).status, 403);
      return true;
    });
  });

  test("网络异常 → network 错误", async () => {
    const failingFetch = async () => {
      throw new Error("connection refused");
    };
    const client = new TokenClient({
      baseURL: "http://localhost:9096",
      tokenProvider: () => "jwt",
      fetchImpl: failingFetch as unknown as typeof fetch,
    });
    await assert.rejects(client.getUsage(), (err: unknown) => {
      assert.ok(err instanceof TokenError);
      assert.equal((err as TokenError).kind, "network");
      return true;
    });
  });
});
