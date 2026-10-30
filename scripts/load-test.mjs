/** Measures actual read-only API latency; writes JSON evidence without inventing benchmarks.
 * Usage: node scripts/load-test.mjs http://localhost:8080 200
 * Runs ten concurrent workers with bounded request timeouts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
const base = new URL(process.argv[2] || "http://localhost:8080");
if (!["http:", "https:"].includes(base.protocol))
  throw new Error("Use an HTTP(S) URL.");
const count = Number(process.argv[3] || 200);
if (!Number.isInteger(count) || count < 1 || count > 10000)
  throw new Error("Request count must be an integer from 1 to 10000.");
const times = [];
let next = 0,
  failures = 0;
const started = performance.now();
await Promise.all(
  Array.from({ length: Math.min(10, count) }, async () => {
    while (next++ < count) {
      const begin = performance.now();
      try {
        const r = await fetch(new URL("/api/releases", base), {
          signal: AbortSignal.timeout(10_000),
        });
        await r.arrayBuffer();
        if (!r.ok) failures++;
      } catch {
        failures++;
      }
      times.push(performance.now() - begin);
    }
  }),
);
const elapsedMs = performance.now() - started;
times.sort((a, b) => a - b);
const result = {
  recordedAt: new Date().toISOString(),
  target: base.origin,
  endpoint: "/api/releases",
  requests: count,
  concurrency: Math.min(10, count),
  failures,
  errorRatePercent: (failures / count) * 100,
  elapsedMs: Math.round(elapsedMs),
  p50Ms: times[Math.ceil(count * 0.5) - 1],
  p95Ms: times[Math.ceil(count * 0.95) - 1],
  note: "Client-observed latency including failed requests; local test is not production capacity.",
};
mkdirSync("evidence", { recursive: true });
const path = `evidence/load-${Date.now()}.json`;
writeFileSync(path, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ ...result, evidence: path }, null, 2));
if (failures) process.exitCode = 1;
