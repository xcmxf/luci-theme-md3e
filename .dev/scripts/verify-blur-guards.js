#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const sourceRoots = [".dev/src/media/main", ".dev/src/public-md3e/components"];
const requiredMediaTokens = [
  "min-width: 64rem",
  "hover: hover",
  "pointer: fine",
];
const errors = [];

function collectCssFiles(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => path.join(root, entry.name))
    .sort();
}

function mediaBlockForIndex(source, index) {
  const mediaStart = source.lastIndexOf("@media", index);
  if (mediaStart < 0) return "";

  const mediaHeaderEnd = source.indexOf("{", mediaStart);
  if (mediaHeaderEnd < 0 || mediaHeaderEnd > index) return "";

  let depth = 0;
  for (let i = mediaHeaderEnd; i < index; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth <= 0) return "";
  }

  return source.slice(mediaStart, mediaHeaderEnd);
}

for (const root of sourceRoots.map((rootPath) =>
  path.join(projectRoot, rootPath),
)) {
  for (const filePath of collectCssFiles(root)) {
    const source = fs.readFileSync(filePath, "utf-8");
    const relativePath = path
      .relative(projectRoot, filePath)
      .replace(/\\/g, "/");
    const blurPattern = /(?:-webkit-)?backdrop-filter:\s*blur\(/g;
    const nonePattern = /(?:-webkit-)?backdrop-filter:\s*none/g;
    let hasReducedTransparencyOptOut = false;
    let match;

    while ((match = nonePattern.exec(source))) {
      const mediaBlock = mediaBlockForIndex(source, match.index);
      if (mediaBlock.includes("prefers-reduced-transparency: reduce")) {
        hasReducedTransparencyOptOut = true;
        break;
      }
    }

    while ((match = blurPattern.exec(source))) {
      const mediaBlock = mediaBlockForIndex(source, match.index);
      const missing = requiredMediaTokens.filter(
        (token) => !mediaBlock.includes(token),
      );

      if (missing.length) {
        errors.push(
          `${relativePath} uses backdrop blur outside guarded desktop transparency media: missing ${missing.join(", ")}`,
        );
      }

      if (!hasReducedTransparencyOptOut) {
        errors.push(
          `${relativePath} uses backdrop blur without a prefers-reduced-transparency: reduce opt-out`,
        );
      }
    }
  }
}

if (errors.length) {
  throw new Error(`blur guard verification failed:\n${errors.join("\n")}`);
}

console.log(
  "blur guards ok: backdrop blur is desktop-gated with reduced-transparency opt-outs",
);
