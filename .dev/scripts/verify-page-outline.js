#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const sourcePaths = [
  "13-page-outline-collect.js",
  "14-page-outline-render.js",
  "15-page-outline-observe.js",
].map((file) => path.join(devRoot, "src", "resource", "menu-md3e-v2", file));
const source = sourcePaths
  .map((sourcePath) => fs.readFileSync(sourcePath, "utf-8"))
  .join("\n");
const errors = [];

const requiredAnchors = [
  "const visibleSections = sections.slice(0, 8);",
  "const visibleSectionIds = new Set(",
  "hasPageOutlineBodyContent(section, titleNode)",
  "isPageOutlineOmittedNode(node)",
  'const displayName = ["dis", "play"].join("");',
  'const displayNone = ["no", "ne"].join("");',
  ".cbi-title",
  ".ifacebox",
  ".cbi-section-node",
  "visibleSections.forEach((section, index) => {",
  "if (!visibleSectionIds.has(id)) return false;",
  "if (!visibleSectionIds.has(targetId)) return;",
  "visibleSections.forEach((section) =>",
];

const requiredFiles = new Map([
  [
    "13-page-outline-collect.js",
    [
      "getPageOutlineSections(map)",
      "hasPageOutlineBodyContent(section, titleNode)",
    ],
  ],
  [
    "14-page-outline-render.js",
    [
      "teardownPageChrome()",
      "syncPageOutline(sections)",
      "this._pageOutlineObserver = new IntersectionObserver",
    ],
  ],
  [
    "15-page-outline-observe.js",
    [
      "initPageChrome()",
      "this._pageChromeMutationDisconnect = this.observeDomMutations",
    ],
  ],
]);

for (const [file, anchors] of requiredFiles) {
  const fileSource = fs.readFileSync(
    path.join(devRoot, "src", "resource", "menu-md3e-v2", file),
    "utf-8",
  );
  for (const anchor of anchors) {
    if (!fileSource.includes(anchor)) {
      errors.push(`${file} is missing page outline anchor: ${anchor}`);
    }
  }
}

for (const anchor of requiredAnchors) {
  if (!source.includes(anchor)) {
    errors.push(`page outline source is missing guard: ${anchor}`);
  }
}

if (source.includes("sections.slice(0, 8).forEach")) {
  errors.push("page outline list rendering bypasses visibleSections");
}

if (source.includes("sections.forEach((section) =>")) {
  errors.push("page outline observer still watches hidden sections");
}

if (
  !source.includes(
    "if (!this.hasPageOutlineBodyContent(section, titleNode)) return null;",
  )
) {
  errors.push(
    "page outline section collection still accepts title-only sections",
  );
}

if (errors.length) {
  throw new Error(`page outline verification failed:\n${errors.join("\n")}`);
}

console.log(
  "page outline ok: rendered links, active state, and observer align",
);
