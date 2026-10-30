/** Prepare a reviewable deployment change. Does NOT commit, push, apply, or contact AWS.
 * Usage: node scripts/promote.mjs API_REPOSITORY@sha256:DIGEST WEB_REPOSITORY@sha256:DIGEST
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseDocument } from "yaml";
const [api, web] = process.argv.slice(2);
const pattern =
  /^([0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9-]+)@(sha256:[a-f0-9]{64})$/;
if (!pattern.test(api || "") || !pattern.test(web || ""))
  throw new Error("Provide two ECR image references pinned to sha256 digests.");
const file = new URL(
  "../deploy/overlays/eks/kustomization.yaml",
  import.meta.url,
);
const doc = parseDocument(readFileSync(file, "utf8"));
doc.set(
  "images",
  [api, web].map((image, index) => {
    const [, name, digest] = image.match(pattern);
    return {
      name: index ? "shipyard-web" : "shipyard-api",
      newName: name,
      digest,
    };
  }),
);
writeFileSync(file, String(doc));
console.log(
  "Updated EKS overlay. Review the diff and open a promotion pull request.",
);
