/** Safe local bootstrap. Never overwrites existing credentials or prints secrets.
 * compose.yaml consumes these values; docs/development.md explains native development.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const target = fileURLToPath(new URL("../.env", import.meta.url));
const root = randomBytes(32).toString("hex");
const app = randomBytes(32).toString("hex");
try {
  writeFileSync(
    target,
    `# Generated locally; do not commit or share.\nMONGO_ROOT_PASSWORD=${root}\nMONGO_APP_PASSWORD=${app}\nWRITE_TOKEN=${randomBytes(32).toString("hex")}\nMONGODB_URI=mongodb://shipyard:${app}@127.0.0.1:27017/shipyard?authSource=shipyard\nPORT=4000\nAPP_VERSION=local\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created .env with private local credentials. Run docker compose up --build -d.",
  );
} catch (error) {
  if (error.code === "EEXIST")
    console.log(".env already exists; existing credentials preserved.");
  else throw error;
}
