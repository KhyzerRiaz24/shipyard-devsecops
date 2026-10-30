/** Offline, dependency-free check for common accidentally committed credentials.
 * Reads Git-eligible text files locally; sends no source or secrets to any service.
 * This catches common key formats, not every possible secret or encoded credential.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const ignored = new Set([
  "node_modules",
  ".git",
  ".cache",
  ".terraform",
  "dist",
  "coverage",
  "backups",
  "test-results",
  "playwright-report",
]);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (
      ignored.has(entry.name) ||
      (entry.name.startsWith(".env") && entry.name !== ".env.example")
    )
      return [];
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : entry.isFile()
        ? [relative(root, path)]
        : [];
  });
}
const tracked = spawnSync("git", ["ls-files", "--cached", "-z"], {
  cwd: root,
  encoding: "utf8",
});
if (
  tracked.status === 0 &&
  tracked.stdout
    .split("\0")
    .some(
      (name) =>
        /(^|\/)\.env($|\.)/.test(name) && !name.endsWith(".env.example"),
    )
)
  throw new Error(
    "A private environment file is tracked by Git. Remove it and rotate any exposed credentials.",
  );
const eligible = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
const files =
  eligible.status === 0
    ? [...new Set(eligible.stdout.split("\0").filter(Boolean))]
    : walk(root);
const patterns = [
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  ["OpenAI key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
];
const findings = [];
let checked = 0;
for (const file of files) {
  const path = join(root, file);
  if (
    !statSync(path).isFile() ||
    statSync(path).size > 1_000_000 ||
    /\.(png|jpg|jpeg|gif|zip|gz|pdf|woff2?)$/i.test(file)
  )
    continue;
  const text = readFileSync(path, "utf8");
  if (text.includes("\0")) continue;
  checked++;
  for (const [kind, pattern] of patterns)
    if (pattern.test(text)) findings.push({ file, kind });
}
if (findings.length) {
  // Never print the matching credential itself.
  console.error(JSON.stringify({ findings }, null, 2));
  process.exitCode = 1;
} else
  console.log(
    `Offline credential-pattern check passed for ${checked} text files (not an exhaustive secret audit).`,
  );
