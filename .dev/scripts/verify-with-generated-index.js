#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const generatedPath = "htdocs/luci-static";
const verifyScriptsBeforeGenerated = [
  "format:check",
  "verify:source-parts",
  "verify:source-part-budget",
  "assemble:check",
  "verify:release",
  "verify:breakpoints",
  "verify:assets",
  "verify:templates",
  "verify:licenses",
  "verify:local-artifacts",
  "verify:login-fallback",
  "verify:critical-selectors",
  "verify:runtime-observers",
  "verify:blur-guards",
  "verify:page-outline",
  "verify:preview-smoke",
];
const verifyScriptsAfterGenerated = [
  "verify:generated-sources",
  "verify:terser",
  "verify:tailwind",
  "verify:js-budget",
  "verify:css-budget",
];

function run(command, args, options = {}) {
  const useShell = Boolean(options.shell);
  const shellCommand = useShell ? [command, ...args].join(" ") : command;
  const shellArgs = useShell ? [] : args;
  const result = spawnSync(shellCommand, shellArgs, {
    cwd: options.cwd || projectRoot,
    encoding: "utf-8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: useShell,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = options.capture
      ? `\n${result.stdout || ""}${result.stderr || ""}`
      : "";
    throw new Error(`${shellCommand} ${shellArgs.join(" ")} failed${output}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

let stagedBefore = "";
let generatedDirtyBefore = "";
let generatedTouched = false;

try {
  stagedBefore = run("git", ["diff", "--cached", "--name-only"], {
    capture: true,
  });
  if (stagedBefore) {
    throw new Error(
      "verify:with-generated-index requires an empty index so it can safely stage and unstage generated files",
    );
  }

  generatedDirtyBefore = run(
    "git",
    ["status", "--porcelain", "--", generatedPath],
    {
      capture: true,
    },
  );
  generatedTouched = true;
  run("npm", ["run", "build"], {
    cwd: path.join(projectRoot, ".dev"),
    shell: process.platform === "win32",
  });
  run("git", ["add", generatedPath]);

  for (const scriptName of verifyScriptsBeforeGenerated) {
    run("npm", ["run", scriptName], {
      cwd: path.join(projectRoot, ".dev"),
      shell: process.platform === "win32",
    });
  }

  run("npm", ["run", "verify:generated"], {
    cwd: path.join(projectRoot, ".dev"),
    shell: process.platform === "win32",
  });

  for (const scriptName of verifyScriptsAfterGenerated) {
    run("npm", ["run", scriptName], {
      cwd: path.join(projectRoot, ".dev"),
      shell: process.platform === "win32",
    });
  }
} finally {
  if (generatedTouched) {
    run("git", ["restore", "--staged", generatedPath]);

    if (!generatedDirtyBefore) {
      run("git", ["restore", "--worktree", generatedPath]);
    }
  }
}
