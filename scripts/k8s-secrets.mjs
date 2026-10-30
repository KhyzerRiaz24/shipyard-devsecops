/** Explicit operator action; passes secrets to kubectl over stdin, never process arguments.
 * Usage: node scripts/k8s-secrets.mjs EXPECTED_CONTEXT
 * Creates secrets once. Refuses rotation because changing env vars does not rotate Mongo users.
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const context = process.argv[2];
if (!context) throw new Error("Provide the exact expected kubectl context.");
const current = spawnSync("kubectl", ["config", "current-context"], {
  encoding: "utf8",
});
if (current.status !== 0 || current.stdout.trim() !== context)
  throw new Error("Kubernetes context mismatch. No changes made.");
const existing = spawnSync(
  "kubectl",
  [
    "-n",
    "shipyard",
    "get",
    "secrets",
    "app-secrets",
    "mongo-secrets",
    "--ignore-not-found",
    "-o",
    "name",
  ],
  { encoding: "utf8" },
);
if (existing.status !== 0)
  throw new Error(
    "Cannot inspect existing secrets. Apply namespace.yaml and check access first.",
  );
if (existing.stdout.trim())
  throw new Error(
    "Existing credentials preserved. Follow the runbook to rotate passwords safely.",
  );
const root = randomBytes(32).toString("hex"),
  app = randomBytes(32).toString("hex"),
  token = randomBytes(32).toString("hex");
const objects = [
  {
    apiVersion: "v1",
    kind: "Secret",
    metadata: { name: "mongo-secrets", namespace: "shipyard" },
    type: "Opaque",
    stringData: {
      MONGO_INITDB_ROOT_USERNAME: "root",
      MONGO_INITDB_ROOT_PASSWORD: root,
      MONGO_APP_PASSWORD: app,
    },
  },
  {
    apiVersion: "v1",
    kind: "Secret",
    metadata: { name: "app-secrets", namespace: "shipyard" },
    type: "Opaque",
    stringData: {
      MONGODB_URI: `mongodb://shipyard:${app}@mongo:27017/shipyard?authSource=shipyard`,
      WRITE_TOKEN: token,
    },
  },
];
mkdirSync(".cache", { recursive: true, mode: 0o700 });
// Keep a private recovery copy before mutation; do not print its contents.
const path = `.cache/cluster-secrets-${Date.now()}.json`;
writeFileSync(path, JSON.stringify(objects, null, 2), {
  mode: 0o600,
  flag: "wx",
});
const created = spawnSync("kubectl", ["create", "-f", "-"], {
  input: JSON.stringify({ apiVersion: "v1", kind: "List", items: objects }),
  encoding: "utf8",
});
if (created.status !== 0)
  throw new Error(
    `Secret creation failed or was partial. Recover from ${path}; inspect the cluster before retrying.`,
  );
console.log(
  `Secrets created. Private recovery copy: ${path}. Store it securely; do not commit it.`,
);
