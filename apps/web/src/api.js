/** One same-origin API boundary. No token is persisted in localStorage or bundled at build time. */
import { DEMO_MODE } from "./mode.js";
import { demoRequest } from "./demo.js";
export async function request(path, options = {}) {
  // GitHub Pages runs an explicit browser-only demo; full builds call Express.
  if (DEMO_MODE) return demoRequest(path, options);
  const response = await fetch(path, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10_000),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
