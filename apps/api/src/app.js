/** HTTP boundary: frontend -> /api/* -> validation/authentication -> store.js -> MongoDB.
 * /health/live is process health; /health/ready checks MongoDB. /metrics feeds Prometheus.
 * Release entries are a manual journal, NOT proof that Jenkins deployed that version.
 */
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createTelemetry } from "./telemetry.js";
import { z } from "zod";

const releaseSchema = z
  .object({
    service: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/),
    version: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:@/-]*$/),
    environment: z.enum(["development", "staging", "production"]),
    status: z.enum(["succeeded", "failed", "rolled_back"]),
    notes: z.string().trim().max(500).default(""),
  })
  .strict();

export function createApp({
  store,
  writeToken,
  version = "local",
  requestLimit = 60,
}) {
  if (!writeToken || writeToken.length < 32)
    throw new Error("WRITE_TOKEN must contain at least 32 characters.");
  const app = express();
  app.disable("x-powered-by");
  // Trust exactly the local reverse proxy. NetworkPolicy limits Kubernetes API ingress.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "8kb" }));

  const { registry, middleware } = createTelemetry();
  app.use(middleware);

  app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", async (_req, res) => {
    try {
      await store.ping();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.get("/api/system", async (_req, res) => {
    let database = "unavailable";
    try {
      await store.ping();
      database = "connected";
    } catch {
      /* Report actual readiness without exposing connection details. */
    }
    res.set("Cache-Control", "no-store").json({
      version,
      database,
      journal: "manual",
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });
  app.get("/metrics", async (_req, res) =>
    res.type(registry.contentType).send(await registry.metrics()),
  );
  app.get("/api/releases", async (_req, res) => {
    res
      .set("Cache-Control", "no-store")
      .json({ releases: await store.list(), limit: 100 });
  });

  // Token protects writes; reads are deliberately public and must contain no confidential data.
  const expectedTokenHash = crypto
    .createHash("sha256")
    .update(`Bearer ${writeToken}`)
    .digest();
  const writes = rateLimit({
    windowMs: 60_000,
    limit: requestLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many write requests. Try again in a minute." },
  });
  app.post(
    "/api/releases",
    writes,
    (req, res, next) => {
      const supplied = req.get("authorization") || "";
      const actualHash = crypto.createHash("sha256").update(supplied).digest();
      if (!crypto.timingSafeEqual(actualHash, expectedTokenHash))
        return res
          .status(401)
          .json({ error: "A valid write token is required." });
      next();
    },
    async (req, res) => {
      const result = releaseSchema.safeParse(req.body);
      if (!result.success)
        return res.status(400).json({
          error: "Invalid release.",
          fields: result.error.flatten().fieldErrors,
        });
      const release = {
        ...result.data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source: "manual",
      };
      await store.insert(release);
      res.status(201).json({ release });
    },
  );
  app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ error: "Request body must be valid JSON." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Request body is too large." });
    // Do not return MongoDB URLs, tokens, stack traces or user payloads to clients/logs.
    if (process.env.NODE_ENV !== "test")
      console.error(
        JSON.stringify({ event: "request_failed", name: error.name }),
      );
    res
      .status(503)
      .json({ error: "Service temporarily unavailable. Please retry." });
  });
  return { app, registry };
}
