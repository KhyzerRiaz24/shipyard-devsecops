/** Free showcase adapter: stores demonstration entries in this browser, without a server.
 * api.js uses it only when --mode demo. The Docker/Express/MongoDB path is unchanged.
 * These records never prove that a deployment or a security scan succeeded.
 */
const STORAGE_KEY = "shipyard-demo-releases-v1";

function readReleases() {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(entries) ? entries.slice(0, 100) : [];
  } catch {
    return []; // A cleared or malformed local demo starts with an empty journal.
  }
}

export async function demoRequest(path, options = {}) {
  const method = options.method || "GET";
  if (path === "/api/system" && method === "GET") {
    return {
      version: "browser-demo",
      database: "browser",
      journal: "browser-demo",
    };
  }
  if (path === "/api/releases" && method === "GET") {
    return { releases: readReleases(), limit: 100 };
  }
  if (path === "/api/releases" && method === "POST") {
    const {
      service,
      version,
      environment,
      status,
      notes = "",
    } = JSON.parse(options.body);
    if (
      !service?.trim() ||
      !version?.trim() ||
      !["development", "staging", "production"].includes(environment) ||
      !["succeeded", "failed", "rolled_back"].includes(status)
    ) {
      throw new Error("Enter a service, version, environment and outcome.");
    }
    const release = {
      service: service.trim().slice(0, 60),
      version: version.trim().slice(0, 80),
      environment,
      status,
      notes: notes.trim().slice(0, 500),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: "browser-demo",
    };
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([release, ...readReleases()].slice(0, 100)),
      );
    } catch {
      throw new Error(
        "Browser storage is unavailable. Enable site storage to save a demo entry.",
      );
    }
    return { release };
  }
  throw new Error("This route is not available in the browser demo.");
}
