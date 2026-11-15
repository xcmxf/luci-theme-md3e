#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");

function assertInsideProject(targetPath) {
  const resolved = path.resolve(targetPath);
  const projectPrefix = projectRoot + path.sep;

  if (!resolved.startsWith(projectPrefix)) {
    throw new Error(
      `Refusing to remove path outside project root: ${resolved}`,
    );
  }

  return resolved;
}

function removePath(targetPath) {
  const resolved = assertInsideProject(targetPath);
  if (!fs.existsSync(resolved)) return;

  console.log(`   remove: ${path.relative(projectRoot, resolved)}`);
  fs.rmSync(resolved, { recursive: true, force: true });
}

function cleanBuildOutput() {
  const luciStaticDir = path.join(projectRoot, "htdocs", "luci-static");
  const md3eDir = path.join(luciStaticDir, "md3e");
  const resourcesDir = path.join(luciStaticDir, "resources");
  const sourceResourceDir = path.join(devRoot, "src", "resource");

  console.log("start clean build output...");

  removePath(md3eDir);
  removePath(path.join(resourcesDir, "md3e"));
  fs.mkdirSync(resourcesDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceResourceDir, {
    withFileTypes: true,
  })) {
    if (entry.isFile() && entry.name.endsWith(".js")) {
      removePath(path.join(resourcesDir, entry.name));
    }
  }

  console.log("clean build output done!");
}

cleanBuildOutput();
