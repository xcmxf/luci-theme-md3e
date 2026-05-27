#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const sourcePath = path.join(devRoot, "src", "resource", "menu-md3e-v2.js");
const outputPath = path.join(
  projectRoot,
  "htdocs",
  "luci-static",
  "resources",
  "menu-md3e-v2.js",
);

const source = fs.readFileSync(sourcePath);
const output = fs.readFileSync(outputPath);
const outputText = output.toString("utf-8");
const requiredAnchors = [
  '"use strict";',
  '"require baseclass";',
  '"require ui";',
  '"require request";',
  "return baseclass.extend",
  "MOBILE_LAYOUT_MAX_WIDTH",
  "MOBILE_LAYOUT_QUERY",
];
const errors = [];

function formatBytes(bytes) {
  return `${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

for (const anchor of requiredAnchors) {
  if (!outputText.includes(anchor)) {
    errors.push(`compressed menu output is missing ${anchor}`);
  }
}

if (outputText.includes("__MD3E_")) {
  errors.push("compressed menu output contains unresolved MD3E source tokens");
}

if (output.length >= source.length) {
  errors.push(
    `compressed menu output (${output.length} B) is not smaller than assembled source (${source.length} B)`,
  );
}

if (errors.length) {
  throw new Error(`Terser menu verification failed:\n${errors.join("\n")}`);
}

console.log(
  `Terser menu ok: ${formatBytes(source.length)} source -> ${formatBytes(output.length)} compressed output`,
);
