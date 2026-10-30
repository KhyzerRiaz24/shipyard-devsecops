/** Tests the real HTTP boundary; store.test.js separately verifies the real database adapter. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

process.env.NODE_ENV = "test";
const token = "test-only-token-with-more-than-32-characters";
const entries = [];
let healthy = true;
const store = {
  list: async () => [...entries].reverse(),
  insert: async (r) => {
    entries.push(r);
  },
  ping: async () => {
    if (!healthy) throw new Error("offline");
  },
};
const { app, registry } = createApp({
  store,
  writeToken: token,
  version: "test-sha",
  requestLimit: 100,
});
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  registry.clear();
  await new Promise((r) => server.close(r));
});
const payload = {
  service: "api",
  version: "abc1234",
  environment: "staging",
  status: "succeeded",
  notes: "Release verified.",
};
const post = (body, authorization = `Bearer ${token}`) =>
  fetch(`${base}/api/releases`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization },
    body: JSON.stringify(body),
  });

test("rejects writes with missing/wrong token", async () => {
  for (const value of ["", "Bearer wrong"])
    assert.equal((await post(payload, value)).status, 401);
  assert.equal(entries.length, 0);
});
test("validates payload, strips nothing silently, rejects HTML service names", async () => {
  for (const body of [
    { ...payload, environment: "live" },
    { ...payload, service: "<script>" },
    { ...payload, notes: "x".repeat(501) },
    { ...payload, admin: true },
    {},
  ])
    assert.equal((await post(body)).status, 400);
});
test("creates and lists a release with server-owned identity and timestamp", async () => {
  const response = await post(payload);
  assert.equal(response.status, 201);
  const { release } = await response.json();
  assert.match(release.id, /^[0-9a-f-]{36}$/);
  assert.equal(release.source, "manual");
  assert.ok(Number.isFinite(Date.parse(release.createdAt)));
  const list = await (await fetch(`${base}/api/releases`)).json();
  assert.equal(list.releases[0].version, payload.version);
});
test("keeps liveness up when readiness loses database", async () => {
  healthy = false;
  try {
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    assert.equal((await fetch(`${base}/health/ready`)).status, 503);
    assert.equal(
      (await (await fetch(`${base}/api/system`)).json()).database,
      "unavailable",
    );
  } finally {
    healthy = true;
  }
});
test("returns useful errors for malformed and oversized JSON", async () => {
  assert.equal(
    (
      await fetch(`${base}/api/releases`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad",
      })
    ).status,
    400,
  );
  assert.equal(
    (await post({ ...payload, notes: "x".repeat(9000) })).status,
    413,
  );
});
test("exposes measured metrics and bounded unmatched-route labels", async () => {
  await fetch(`${base}/not-a-real-route`);
  const metrics = await (await fetch(`${base}/metrics`)).text();
  assert.match(metrics, /shipyard_http_requests_total/);
  assert.match(metrics, /route="unmatched"/);
  assert.doesNotMatch(metrics, /not-a-real-route/);
});
test("fails closed for missing configuration", () =>
  assert.throws(() => createApp({ store, writeToken: "" }), /WRITE_TOKEN/));
test("rate limits repeated writes", async () => {
  const limited = createApp({ store, writeToken: token, requestLimit: 1 });
  const listener = limited.app.listen(0, "127.0.0.1");
  await new Promise((r) => listener.once("listening", r));
  const url = `http://127.0.0.1:${listener.address().port}/api/releases`;
  try {
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    };
    assert.equal((await fetch(url, options)).status, 201);
    assert.equal((await fetch(url, options)).status, 429);
  } finally {
    limited.registry.clear();
    await new Promise((r) => listener.close(r));
  }
});
