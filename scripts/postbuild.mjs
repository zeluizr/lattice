// Add a shebang to dist/cli.js and make it executable so the `lattice` bin runs.
import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");

if (!existsSync(cli)) {
  console.error("postbuild: dist/cli.js not found (run tsc first)");
  process.exit(0);
}

const shebang = "#!/usr/bin/env node\n";
let src = readFileSync(cli, "utf8");
if (!src.startsWith(shebang)) {
  src = shebang + src;
  writeFileSync(cli, src);
}
chmodSync(cli, 0o755);
console.log("postbuild: shebang + chmod applied to dist/cli.js");
