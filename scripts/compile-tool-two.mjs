import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "node_modules/@tailwindcss/cli/dist/index.mjs");
const r = spawnSync(
  process.execPath,
  [
    cli,
    "-i",
    resolve(root, "src/tool-two-utilities.css"),
    "-o",
    resolve(root, "src/tool-two.generated.css"),
    "--minify",
  ],
  { cwd: root, stdio: "inherit" },
);
if (r.status !== 0) process.exit(r.status ?? 1);
const css = readFileSync(resolve(root, "src/tool-two.generated.css"), "utf8");
if (
  !css.includes("tailwindcss v4.3.3") ||
  !css.includes("@container panel") ||
  !css.includes("@media") ||
  !css.includes(".p-4")
)
  throw Error("Missing actual Tailwind output");
writeFileSync(resolve(root, "src/tool-two.generated.css"), css);
console.log(
  JSON.stringify({
    compiler: "Tailwind CSS4.3.3 CLI",
    source: "src/tool-two-utilities.css",
    output: "src/tool-two.generated.css",
    bytes: Buffer.byteLength(css),
    scope:
      "raw stylesheet only in T02 iframe; no Preflight; explicit source(none)/inline utilities",
  }),
);
