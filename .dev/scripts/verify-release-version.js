#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

function getSingleMatch(source, pattern, label) {
  const matches = Array.from(source.matchAll(pattern));

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${matches.length}`);
  }

  return matches[0][1].trim();
}

const makefile = readProjectFile("Makefile");
const header = readProjectFile("ucode/template/themes/md3e/header.ut");
const footer = readProjectFile("ucode/template/themes/md3e/footer.ut");

const packageVersion = getSingleMatch(
  makefile,
  /^PKG_VERSION:=(.+)$/gm,
  "PKG_VERSION in Makefile",
);
const packageRelease = getSingleMatch(
  makefile,
  /^PKG_RELEASE:=(.+)$/gm,
  "PKG_RELEASE in Makefile",
);
const releaseCacheVersion = getSingleMatch(
  header,
  /const\s+release_cache_version\s*=\s*['"]([^'"]+)['"]/g,
  "release_cache_version in header.ut",
);

const expectedCacheVersion = `${packageVersion}-${packageRelease}`;

if (releaseCacheVersion !== expectedCacheVersion) {
  throw new Error(
    `release_cache_version mismatch: expected ${expectedCacheVersion}, found ${releaseCacheVersion}`,
  );
}

const requiredHeaderPatterns = [
  {
    pattern:
      /const\s+asset_cache_version\s*=\s*`\$\{tokens\.asset_cache_version\s*\|\|\s*['"]0['"]\}-\$\{release_cache_version\}`;/,
    message: "asset_cache_version must include release_cache_version",
  },
  {
    pattern:
      /const\s+icon_cache_version\s*=\s*`\$\{tokens\.icon_cache_version\s*\|\|\s*['"]0['"]\}-\$\{release_cache_version\}`;/,
    message: "icon_cache_version must include release_cache_version",
  },
  {
    pattern:
      /href="\{\{\s*media\s*\}\}\/main\.css\?v=\{\{\s*asset_cache_version\s*\}\}"/,
    message: "main.css must use asset_cache_version",
  },
  {
    pattern:
      /href="\{\{\s*media\s*\}\}\/components\.css\?v=\{\{\s*asset_cache_version\s*\}\}"/,
    message: "components.css must use asset_cache_version",
  },
  {
    pattern:
      /src="\{\{\s*media\s*\}\}\/images\/\{\{\s*logo_png\s*\}\}\?v=\{\{\s*icon_cache_version\s*\}\}"/,
    message: "template logo image src values must use icon_cache_version",
  },
];
const errors = [];

for (const { pattern, message } of requiredHeaderPatterns) {
  if (!pattern.test(header)) errors.push(message);
}

if (!/L\.require\(['"]menu-md3e-v2['"]\)/.test(footer)) {
  errors.push("footer must load menu-md3e-v2 through LuCI L.require");
}

if (errors.length) {
  throw new Error(`release cache verification failed:\n${errors.join("\n")}`);
}

console.log(`release version ok: ${releaseCacheVersion}, cache links ok`);
