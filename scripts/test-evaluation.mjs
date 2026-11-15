import { build } from "esbuild";
import { spawnSync } from "node:child_process";

await build({
  entryPoints: ["tests/evaluation.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  tsconfig: "tsconfig.app.json",
  outfile: "artifacts/evaluation.test.mjs",
  packages: "external",
});
const result = spawnSync(
  process.execPath,
  ["--test", "artifacts/evaluation.test.mjs"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
