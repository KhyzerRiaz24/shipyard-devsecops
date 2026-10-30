/** Integration test: real MongoDB process; fails (never silently skips) if unavailable.
 * TEST_MONGODB_URI can point at a disposable database; this test only inserts unique events.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectStore } from "../src/store.js";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

test(
  "MongoDB persists events across client reconnections and enforces unique IDs",
  { timeout: 180_000 },
  async () => {
    let mongo, first, second;
    try {
      if (!process.env.TEST_MONGODB_URI)
        mongo = await MongoMemoryServer.create();
      const uri = process.env.TEST_MONGODB_URI || mongo.getUri();
      first = await connectStore(uri);
      const event = {
        id: crypto.randomUUID(),
        service: "integration",
        version: "test",
        createdAt: new Date().toISOString(),
      };
      await first.insert(event);
      await assert.rejects(
        () => first.insert(event),
        (error) => error.code === 11000,
      );
      await first.close();
      first = null;
      second = await connectStore(uri);
      await second.ping();
      assert.ok((await second.list()).some((r) => r.id === event.id && !r._id));

      // Exercise the real process entry point, readiness and graceful termination.
      // PORT=0 lets the OS allocate an unused port; the process reports the bound port.
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL("../src/server.js", import.meta.url))],
        {
          env: {
            ...process.env,
            MONGODB_URI: uri,
            WRITE_TOKEN: "integration-token-longer-than-thirty-two-characters",
            PORT: "0",
            NODE_ENV: "test",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const exited = once(child, "exit");
      try {
        const port = await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("API process did not start")),
            10_000,
          );
          let output = "";
          child.stdout.on("data", (chunk) => {
            output += chunk;
            for (const line of output.split("\n")) {
              try {
                const item = JSON.parse(line);
                if (item.event === "listening") {
                  clearTimeout(timeout);
                  resolve(item.port);
                }
              } catch {
                /* Wait for a complete structured log line. */
              }
            }
          });
          child.once("exit", (code) => {
            clearTimeout(timeout);
            reject(new Error(`API exited before readiness (${code})`));
          });
          child.once("error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
        assert.equal(ready.status, 200);
        child.kill("SIGTERM");
        const [exitCode] = await exited;
        assert.equal(exitCode, 0);
      } finally {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
          await exited;
        }
      }
    } finally {
      await first?.close();
      await second?.close();
      await mongo?.stop();
    }
  },
);
