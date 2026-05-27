#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const generatedSourcePairs = [
  {
    output: "htdocs/luci-static/md3e/main.css",
    sources: [
      ".dev/src/media/main.css",
      ".dev/src/media/main/",
      ".dev/src/assets/",
      ".dev/vite.config.ts",
      ".dev/scripts/",
    ],
  },
  {
    output: "htdocs/luci-static/md3e/components.css",
    sources: [
      ".dev/public/md3e/components.css",
      ".dev/src/public-md3e/components/",
      ".dev/vite.config.ts",
      ".dev/scripts/",
    ],
  },
  {
    output: "htdocs/luci-static/resources/menu-md3e-v2.js",
    sources: [
      ".dev/src/resource/menu-md3e-v2.js",
      ".dev/src/resource/menu-md3e-v2/",
      ".dev/src/shared/",
      ".dev/vite.config.ts",
      ".dev/scripts/",
    ],
  },
];

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf-8",
  });

  if (result.error) throw result.error;
  return result;
}

function hasDiff(relativePath) {
  const diff = runGit(["diff", "--quiet", "--", relativePath]);
  const cachedDiff = runGit([
    "diff",
    "--cached",
    "--quiet",
    "--",
    relativePath,
  ]);
  return diff.status === 1 || cachedDiff.status === 1;
}

function hasSourceDiff(sources) {
  return sources.some((sourcePath) => hasDiff(sourcePath));
}

const errors = [];

for (const pair of generatedSourcePairs) {
  if (!hasDiff(pair.output)) continue;
  if (hasSourceDiff(pair.sources)) continue;

  errors.push(
    `${pair.output} changed without a matching source/script change: ${pair.sources.join(", ")}`,
  );
}

if (errors.length) {
  throw new Error(
    `generated source verification failed:\n${errors.join("\n")}`,
  );
}

console.log(
  `generated sources ok: ${generatedSourcePairs.length} generated outputs guarded`,
);
