#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const routerHost = process.env.MD3E_ROUTER_HOST || "10.0.0.1";
const routerUser = process.env.MD3E_ROUTER_USER || "root";
const routerBaseUrl = process.env.MD3E_ROUTER_URL || `http://${routerHost}`;
const deployTemplates = process.env.MD3E_DEPLOY_TEMPLATES !== "0";
const knownHosts = path.join(projectRoot, ".ssh-known-hosts-md3e");
const cacheDirs = ["/tmp/luci-indexcache", "/tmp/luci-modulecache"];
const staticFiles = [
  {
    label: "main.css",
    localPath: "htdocs/luci-static/md3e/main.css",
    remotePath: "/www/luci-static/md3e/main.css",
    httpPath: "/luci-static/md3e/main.css",
  },
  {
    label: "components.css",
    localPath: "htdocs/luci-static/md3e/components.css",
    remotePath: "/www/luci-static/md3e/components.css",
    httpPath: "/luci-static/md3e/components.css",
  },
  {
    label: "menu-md3e-v2.js",
    localPath: "htdocs/luci-static/resources/menu-md3e-v2.js",
    remotePath: "/www/luci-static/resources/menu-md3e-v2.js",
    httpPath: "/luci-static/resources/menu-md3e-v2.js",
  },
];
const templateFiles = [
  "footer.ut",
  "header.ut",
  "icon_logout.ut",
  "icon_theme_moon.ut",
  "icon_theme_sun.ut",
  "sysauth.ut",
].map((name) => ({
  label: name,
  localPath: `ucode/template/themes/md3e/${name}`,
  remotePath: `/usr/share/ucode/luci/template/themes/md3e/${name}`,
}));
const files = deployTemplates
  ? [...staticFiles, ...templateFiles]
  : staticFiles;

function absolutePath(relativePath) {
  return path.join(projectRoot, relativePath);
}

function readProjectFile(relativePath) {
  return fs.readFileSync(absolutePath(relativePath));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extractReleaseCacheVersion(headerSource) {
  return (
    headerSource
      .toString("utf-8")
      .match(/release_cache_version\s*=\s*['"]([^'"]+)['"]/)?.[1] ?? "unknown"
  );
}

function remoteShellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: options.capture ? "utf-8" : undefined,
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = options.capture
      ? `\n${result.stdout || ""}${result.stderr || ""}`
      : "";
    throw new Error(`${command} ${args.join(" ")} failed${output}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

async function checkHttpAsset(file) {
  const url = new URL(file.httpPath, routerBaseUrl);
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(
      `${file.label} HTTP check failed: ${url.href} -> ${response.status}`,
    );
  }

  return `${file.label} ${response.status} ${
    response.headers.get("content-length") || "unknown"
  } B`;
}

function buildRemoteVerificationCommand(remotePaths) {
  const quotedPaths = remotePaths.map(remoteShellQuote).join(" ");
  const cacheTargets = cacheDirs.map(remoteShellQuote).join(" ");
  return [
    `rm -rf ${cacheTargets}`,
    `sha256sum ${quotedPaths}`,
    'grep -n "release_cache_version\\|asset_cache_version\\|main.css\\|components.css" /usr/share/ucode/luci/template/themes/md3e/header.ut 2>/dev/null || true',
    "apk info -e luci-theme-md3e 2>/dev/null || true",
    "apk info -v luci-theme-md3e 2>/dev/null | head -n 1 || true",
  ].join(" && ");
}

for (const file of files) {
  if (!fs.existsSync(absolutePath(file.localPath))) {
    throw new Error(`missing built file: ${file.localPath}`);
  }
}

const sshOptions = [
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=10",
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  `UserKnownHostsFile=${knownHosts}`,
];
const remote = `${routerUser}@${routerHost}`;
const localReleaseCacheVersion = extractReleaseCacheVersion(
  readProjectFile("ucode/template/themes/md3e/header.ut"),
);
const localHashes = new Map(
  files.map((file) => [
    file.remotePath,
    sha256(readProjectFile(file.localPath)),
  ]),
);

for (const file of files) {
  run("scp", [...sshOptions, file.localPath, `${remote}:${file.remotePath}`]);
}

const remoteOutput = run(
  "ssh",
  [
    ...sshOptions,
    remote,
    buildRemoteVerificationCommand(files.map((file) => file.remotePath)),
  ],
  { capture: true },
);
const remoteHashes = new Map();

for (const line of remoteOutput.split(/\r?\n/)) {
  const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
  if (match) remoteHashes.set(match[2], match[1].toLowerCase());
}

for (const [remotePath, localHash] of localHashes) {
  if (remoteHashes.get(remotePath) !== localHash) {
    throw new Error(
      `${remotePath} hash mismatch: local ${localHash}, remote ${
        remoteHashes.get(remotePath) || "missing"
      }`,
    );
  }
}

const httpSummaries = [];
for (const file of staticFiles) {
  httpSummaries.push(await checkHttpAsset(file));
}

console.log(remoteOutput);
console.log(`local release_cache_version: ${localReleaseCacheVersion}`);
console.log(`HTTP checks: ${httpSummaries.join("; ")}`);
console.log(
  `device static deploy ok: ${remote}; templates ${
    deployTemplates ? "synced and LuCI caches cleared" : "not synced"
  }; package database unchanged`,
);
