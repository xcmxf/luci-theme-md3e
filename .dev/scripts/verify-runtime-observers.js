#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(devRoot, "src", "resource", "menu-md3e-v2");
const allowedObservers = new Map([
  [
    "10-bootstrap-layout.js",
    [
      "target._md3eLazyInitObserver = new MutationObserver",
      "hub.observer = new MutationObserver",
    ],
  ],
  [
    "20-indicators-progress.js",
    ["source._md3eProgressObserved = new MutationObserver"],
  ],
  [
    "22-tabs.js",
    ["const observer = new MutationObserver(updateActiveIndicator)"],
  ],
  ["24-tab-content-view.js", ["new MutationObserver((muts) => {"]],
  [
    "30-split-button-dropdowns.js",
    ["new MutationObserver(() => this.syncSplitButtonLabel(splitButton))"],
  ],
  [
    "32-custom-select-build.js",
    ["const optionObserver = new MutationObserver"],
  ],
]);
const errors = [];

for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

  const filePath = path.join(sourceRoot, entry.name);
  const source = fs.readFileSync(filePath, "utf-8");
  const matches = source.match(/new MutationObserver/g) || [];
  const allowed = allowedObservers.get(entry.name) || [];

  if (matches.length !== allowed.length) {
    errors.push(
      `${entry.name} has ${matches.length} MutationObserver(s), allowlist has ${allowed.length}`,
    );
  }

  for (const anchor of allowed) {
    if (!source.includes(anchor)) {
      errors.push(
        `${entry.name} is missing observer lifecycle anchor: ${anchor}`,
      );
    }
  }
}

const descriptionSource = fs.readFileSync(
  path.join(sourceRoot, "30-description-placement.js"),
  "utf-8",
);
if (!descriptionSource.includes("_md3eVcw")) {
  errors.push(
    "description placement observer must ignore its own md3e state-class mutations",
  );
}

const customSelectSource = fs.readFileSync(
  path.join(sourceRoot, "32-custom-select-build.js"),
  "utf-8",
);
if (!customSelectSource.includes("cleanupSelect(sel)")) {
  errors.push(
    "custom select option observers must disconnect when selects are removed",
  );
}

if (errors.length) {
  throw new Error(
    `runtime observer verification failed:\n${errors.join("\n")}`,
  );
}

console.log(
  `runtime observers ok: ${Array.from(allowedObservers.values()).flat().length} observer lifecycles allowlisted`,
);
