/** Process entry point used by Docker/Kubernetes. Fail closed if configuration is missing.
 * SIGTERM drains HTTP requests before closing MongoDB during a rolling deployment.
 */
import { createApp } from "./app.js";
import { connectStore } from "./store.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required. Run node scripts/setup.mjs first.");
if (!process.env.WRITE_TOKEN || process.env.WRITE_TOKEN.length < 32)
  throw new Error("WRITE_TOKEN must contain at least 32 characters.");
const store = await connectStore(process.env.MONGODB_URI);
const { app } = createApp({
  store,
  writeToken: process.env.WRITE_TOKEN,
  version: process.env.APP_VERSION,
});
const server = app.listen(Number(process.env.PORT || 4000), "0.0.0.0", () =>
  console.log(
    JSON.stringify({
      event: "listening",
      port: server.address().port,
    }),
  ),
);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const forceExit = setTimeout(() => process.exit(1), 15_000).unref();
  server.close(async () => {
    await store.close();
    clearTimeout(forceExit);
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
