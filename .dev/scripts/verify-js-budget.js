#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const outputRelativePath = "htdocs/luci-static/resources/menu-md3e-v2.js";
const outputPath = path.join(projectRoot, outputRelativePath);
const partRoot = path.join(devRoot, "src", "resource", "menu-md3e-v2");
const outputBudget = {
  label: "menu-md3e-v2.js",
  maxBytes: 64 * 1024,
  maxGzipBytes: 18 * 1024,
};
const sourcePartBudget = {
  label: "LuCI menu source part",
  maxBytes: 12 * 1024,
  reportLimit: 5,
};
const warningRatio = 0.92;

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

const output = fs.readFileSync(outputPath);
const gzipBytes = zlib.gzipSync(output, { level: 9 }).length;
const indexContent = readIndexBytes(outputRelativePath);
const indexGzipBytes =
  indexContent === null
    ? null
    : zlib.gzipSync(indexContent, { level: 9 }).length;
const errors = [];
const warnings = [];
const summaries = [
  `${outputBudget.label}: ${formatBytes(output.length)}, gzip ${formatBytes(gzipBytes)}, ${formatHeadroom(output.length, outputBudget.maxBytes)}, gzip ${formatHeadroom(gzipBytes, outputBudget.maxGzipBytes)}, ${formatDelta(output.length, indexContent?.length ?? null)}, gzip ${formatDelta(gzipBytes, indexGzipBytes)}`,
];

if (output.length > outputBudget.maxBytes) {
  errors.push(
    `${outputBudget.label} is ${formatBytes(output.length)}, budget ${formatBytes(outputBudget.maxBytes)}`,
  );
} else if (output.length >= outputBudget.maxBytes * warningRatio) {
  warnings.push(
    `${outputBudget.label} is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(output.length)} / ${formatBytes(outputBudget.maxBytes)}`,
  );
}

if (gzipBytes > outputBudget.maxGzipBytes) {
  errors.push(
    `${outputBudget.label} gzip is ${formatBytes(gzipBytes)}, budget ${formatBytes(outputBudget.maxGzipBytes)}`,
  );
} else if (gzipBytes >= outputBudget.maxGzipBytes * warningRatio) {
  warnings.push(
    `${outputBudget.label} gzip is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(gzipBytes)} / ${formatBytes(outputBudget.maxGzipBytes)}`,
  );
}

const rankedParts = collectJsParts(partRoot).map((filePath) => {
  const size = fs.statSync(filePath).size;
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, "/");

  if (size > sourcePartBudget.maxBytes) {
    errors.push(
      `${relativePath} is ${formatBytes(size)}, ${sourcePartBudget.label} budget ${formatBytes(sourcePartBudget.maxBytes)}`,
    );
  } else if (size >= sourcePartBudget.maxBytes * warningRatio) {
    warnings.push(
      `${relativePath} is above ${Math.round(warningRatio * 100)}% of ${sourcePartBudget.label} budget: ${formatBytes(size)} / ${formatBytes(sourcePartBudget.maxBytes)}`,
    );
  }

  return { relativePath, size };
});

rankedParts.sort((a, b) => b.size - a.size);
summaries.push(
  `${sourcePartBudget.label} top ${Math.min(sourcePartBudget.reportLimit, rankedParts.length)}: ${rankedParts
    .slice(0, sourcePartBudget.reportLimit)
    .map((file) => `${file.relativePath} ${formatBytes(file.size)}`)
    .join(", ")}`,
);

if (errors.length) {
  throw new Error(`JS size budget failed:\n${errors.join("\n")}`);
}

if (warnings.length) {
  console.warn(`JS size budget warnings:\n${warnings.join("\n")}`);
}

console.log(`JS size budget ok: ${summaries.join("; ")}`);
