#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { sourceAssemblies } from "./source-assemblies.js";

const devRoot = fileURLToPath(new URL("../", import.meta.url));
const assetRoot = path.resolve(devRoot, "../htdocs/luci-static");

console.log("Built theme assets");
for (const asset of [
  "md3e/main.css",
  "md3e/components.css",
  "resources/md3e/menu-md3e-v2.js",
  "resources/md3e/md3e-overview.js",
  "resources/md3e/md3e-processes.js",
  "resources/md3e/md3e-management.js",
]) {
  const file = path.join(assetRoot, asset);
  if (!fs.existsSync(file)) {
    console.log(`${asset}: missing, run npm run build`);
    continue;
  }

  const bytes = fs.readFileSync(file);
  console.log(
    `${asset}: ${bytes.length} B, gzip ${gzipSync(bytes, { level: 9 }).length} B`,
  );
}

for (const { label, parts } of sourceAssemblies) {
  const sizes = parts.map((part) => ({
    part,
    bytes: fs.statSync(path.join(devRoot, part)).size,
  }));
  sizes.sort((a, b) => b.bytes - a.bytes);
  const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
  console.log(`\n${label}: ${total} B across ${sizes.length} parts`);
  for (const { part, bytes } of sizes.slice(0, 5)) {
    console.log(`  ${part}: ${bytes} B`);
  }
}
