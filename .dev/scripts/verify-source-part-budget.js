#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceAssemblies } from "./source-assemblies.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const limits = {
  ".css": 14 * 1024,
  ".js": 8 * 1024,
};
const errors = [];
const largest = [];

for (const assembly of sourceAssemblies) {
  for (const part of assembly.parts) {
    const extension = path.extname(part);
    const limit = limits[extension];
    if (!limit) continue;

    const filePath = path.join(devRoot, part);
    const bytes = fs.statSync(filePath).size;
    largest.push({ part, bytes, limit });

    if (bytes > limit) {
      errors.push(
        `${part} is ${bytes} B, over ${Math.round(limit / 1024)} KiB source-part budget`,
      );
    }
  }
}

if (errors.length) {
  throw new Error(`source part budget failed:\n${errors.join("\n")}`);
}

const summary = largest
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 8)
  .map(
    ({ part, bytes, limit }) =>
      `${part} ${bytes} B/${Math.round(limit / 1024)} KiB`,
  )
  .join("; ");

console.log(`source part budget ok: ${summary}`);
