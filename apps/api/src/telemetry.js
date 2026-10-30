/** Request metrics and structured logs. app.js installs this middleware; Prometheus scrapes its registry.
 * Route templates keep metric labels bounded, and logs never include payloads or credentials.
 */
import crypto from "node:crypto";
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from "prom-client";
export function createTelemetry() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  const requests = new Counter({
    name: "shipyard_http_requests_total",
    help: "Completed HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const duration = new Histogram({
    name: "shipyard_http_request_duration_seconds",
    help: "HTTP response duration in seconds",
    labelNames: ["method", "route"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
  });
  const middleware = (req, res, next) => {
    const start = process.hrtime.bigint();
    const requestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.on("finish", () => {
      // Use route templates, never arbitrary URLs: prevents unbounded metric labels.
      const route = req.route?.path || "unmatched";
      if (route !== "/metrics") {
        const seconds = Number(process.hrtime.bigint() - start) / 1e9;
        requests.inc({
          method: req.method,
          route,
          status: String(res.statusCode),
        });
        duration.observe({ method: req.method, route }, seconds);
        if (process.env.NODE_ENV !== "test")
          console.log(
            JSON.stringify({
              requestId,
              method: req.method,
              route,
              status: res.statusCode,
              durationMs: Math.round(seconds * 1000),
            }),
          );
      }
    });
    next();
  };
  return { registry, middleware };
}
