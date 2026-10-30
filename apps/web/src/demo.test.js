/** Demo behaviour is tested separately from the real API: no shared server state or fake health. */
import { beforeEach, expect, test, vi } from "vitest";
import { demoRequest } from "./demo.js";
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
const entry = {
  service: "api",
  version: "demo-1",
  environment: "staging",
  status: "succeeded",
  notes: "An example outcome",
};
const save = (value) =>
  demoRequest("/api/releases", { method: "POST", body: JSON.stringify(value) });
test("identifies browser storage without claiming a database connection", async () => {
  expect(await demoRequest("/api/system")).toMatchObject({
    database: "browser",
    journal: "browser-demo",
  });
});
test("persists independent entries and returns the newest first", async () => {
  const first = await save(entry);
  const second = await save({ ...entry, version: "demo-2" });
  expect(first.release.id).not.toBe(second.release.id);
  expect(
    (await demoRequest("/api/releases")).releases.map((r) => r.version),
  ).toEqual(["demo-2", "demo-1"]);
  expect(first.release.source).toBe("browser-demo");
});
test("rejects invalid outcomes without saving them", async () => {
  await expect(save({ ...entry, status: "unknown" })).rejects.toThrow(
    "Enter a service",
  );
  expect((await demoRequest("/api/releases")).releases).toEqual([]);
});
test("recovers from malformed browser data", async () => {
  localStorage.setItem("shipyard-demo-releases-v1", "not-json");
  expect((await demoRequest("/api/releases")).releases).toEqual([]);
  await save(entry);
  expect((await demoRequest("/api/releases")).releases).toHaveLength(1);
});
test("reports blocked browser storage instead of claiming the entry was saved", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  await expect(save(entry)).rejects.toThrow("Browser storage is unavailable");
});
test("does not simulate unsupported API routes", async () => {
  await expect(demoRequest("/metrics")).rejects.toThrow("not available");
});
