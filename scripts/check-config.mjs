/** Offline configuration check: parse every YAML document and check referenced Kustomize files.
 * --release also refuses unpromoted image placeholders. Kubernetes schema validation is separate.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { parseAllDocuments } from "yaml";
const roots = ["deploy", "monitoring", ".github/workflows"];
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const files = ["compose.yaml", ...roots.flatMap(walk)].filter((f) =>
  /\.ya?ml$/.test(f),
);
let documents = 0;
for (const file of files) {
  for (const doc of parseAllDocuments(readFileSync(file, "utf8"), {
    uniqueKeys: true,
  })) {
    if (doc.errors.length)
      throw new Error(
        `${file}: ${doc.errors.map((e) => e.message).join("; ")}`,
      );
    const value = doc.toJS();
    if (!value) continue;
    documents++;
    if (value.kind === "Kustomization")
      for (const resource of value.resources || []) {
        if (!existsSync(join(dirname(file), resource)))
          throw new Error(`${file}: missing resource ${resource}`);
      }
  }
}
if (process.argv.includes("--release")) {
  const overlay = parseAllDocuments(
    readFileSync("deploy/overlays/eks/kustomization.yaml", "utf8"),
  )[0].toJS();
  if (
    overlay.images?.length !== 2 ||
    overlay.images.some((i) => !/^sha256:[a-f0-9]{64}$/.test(i.digest || ""))
  )
    throw new Error(
      "EKS images are not promoted to two immutable digests. Run scripts/promote.mjs.",
    );
  const argo = readFileSync("deploy/argocd/application.yaml", "utf8");
  if (argo.includes("REPLACE_WITH"))
    throw new Error("Configure the Argo CD repository URL before release.");
}
console.log(
  `Parsed ${documents} YAML documents across ${files.length} files; Kustomize references resolve.`,
);
