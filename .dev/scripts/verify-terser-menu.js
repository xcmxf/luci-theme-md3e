#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
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
const outputRelativePath = "htdocs/luci-static/resources/menu-md3e-v2.js";
const partRoot = path.join(devRoot, "src", "resource", "menu-md3e-v2");
const outputBudget = {
  maxBytes: 64 * 1024,
  maxGzipBytes: 18 * 1024,
};
const sourcePartBudget = {
  maxBytes: 12 * 1024,
  reportLimit: 5,
};
const warningRatio = 0.9;

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
const warnings = [];
const summaries = [];

function formatBytes(bytes) {
  return `${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

function formatHeadroom(currentBytes, maxBytes) {
  return `${formatBytes(maxBytes - currentBytes)} remaining`;
}

function readIndexBytes(relativePath) {
  const result = spawnSync("git", ["show", `:${relativePath}`], {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0 || result.error) return null;
  return result.stdout;
}

function formatDelta(currentBytes, previousBytes) {
  if (previousBytes === null) return "index delta n/a";
  const delta = currentBytes - previousBytes;
  const sign = delta > 0 ? "+" : "";
  return `index delta ${sign}${formatBytes(delta)}`;
}

function collectJsParts(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(root, entry.name))
    .sort();
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

const gzipBytes = zlib.gzipSync(output, { level: 9 }).length;
const indexContent = readIndexBytes(outputRelativePath);
const indexGzipBytes =
  indexContent === null
    ? null
    : zlib.gzipSync(indexContent, { level: 9 }).length;

summaries.push(
  `menu-md3e-v2.js: ${formatBytes(output.length)}, gzip ${formatBytes(gzipBytes)}, ${formatHeadroom(output.length, outputBudget.maxBytes)}, gzip ${formatHeadroom(gzipBytes, outputBudget.maxGzipBytes)}, ${formatDelta(output.length, indexContent?.length ?? null)}, gzip ${formatDelta(gzipBytes, indexGzipBytes)}`,
);

if (output.length > outputBudget.maxBytes) {
  errors.push(
    `menu-md3e-v2.js is ${formatBytes(output.length)}, budget ${formatBytes(outputBudget.maxBytes)}`,
  );
} else if (output.length >= outputBudget.maxBytes * warningRatio) {
  warnings.push(
    `menu-md3e-v2.js is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(output.length)} / ${formatBytes(outputBudget.maxBytes)}`,
  );
}

if (gzipBytes > outputBudget.maxGzipBytes) {
  errors.push(
    `menu-md3e-v2.js gzip is ${formatBytes(gzipBytes)}, budget ${formatBytes(outputBudget.maxGzipBytes)}`,
  );
} else if (gzipBytes >= outputBudget.maxGzipBytes * warningRatio) {
  warnings.push(
    `menu-md3e-v2.js gzip is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(gzipBytes)} / ${formatBytes(outputBudget.maxGzipBytes)}`,
  );
}

const rankedParts = collectJsParts(partRoot).map((filePath) => {
  const size = fs.statSync(filePath).size;
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");
  if (size > sourcePartBudget.maxBytes) {
    errors.push(
      `${relativePath} is ${formatBytes(size)}, LuCI menu source part budget ${formatBytes(sourcePartBudget.maxBytes)}`,
    );
  } else if (size >= sourcePartBudget.maxBytes * warningRatio) {
    warnings.push(
      `${relativePath} is above ${Math.round(warningRatio * 100)}% of LuCI menu source part budget: ${formatBytes(size)} / ${formatBytes(sourcePartBudget.maxBytes)}`,
    );
  }
  return { relativePath, size };
});

rankedParts.sort((a, b) => b.size - a.size);
summaries.push(
  `LuCI menu source part top ${Math.min(sourcePartBudget.reportLimit, rankedParts.length)}: ${rankedParts
    .slice(0, sourcePartBudget.reportLimit)
    .map((file) => `${file.relativePath} ${formatBytes(file.size)}`)
    .join(", ")}`,
);

if (errors.length) {
  throw new Error(`Terser menu verification failed:\n${errors.join("\n")}`);
}

if (warnings.length) {
  console.warn(`Terser menu warnings:\n${warnings.join("\n")}`);
}

console.log(
  `Terser menu ok: ${formatBytes(source.length)} source -> ${summaries.join("; ")}`,
);
