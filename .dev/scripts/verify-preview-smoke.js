#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const require = createRequire(import.meta.url);
const previewHost = "127.0.0.1";
const preferredPreviewPort =
  Number(process.env.MD3E_PREVIEW_SMOKE_PORT) || 4173;
const viewportMatrix = [
  { name: "phone-320", width: 320, height: 720, isMobile: true },
  { name: "phone-390", width: 390, height: 844, isMobile: true },
  { name: "tablet-920", width: 920, height: 900, isMobile: false },
  { name: "desktop-921", width: 921, height: 900, isMobile: false },
  { name: "desktop-wide", width: 1440, height: 1000, isMobile: false },
];
const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

function resolvePlaywright() {
  const localPath = firstExisting(
    [
      path.join(devRoot, ".tmp-playwright", "node_modules", "playwright"),
      path.join(devRoot, ".tmp-playwright-rc7", "node_modules", "playwright"),
      path.join(projectRoot, ".tmp-playwright", "node_modules", "playwright"),
      path.join(
        projectRoot,
        ".tmp-playwright-rc7",
        "node_modules",
        "playwright",
      ),
    ].map((candidate) => path.normalize(candidate)),
  );
  if (localPath) return localPath;
  try {
    return require.resolve("playwright");
  } catch {
    return null;
  }
}

function waitForPort(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ host: previewHost, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(
            new Error(`preview server did not open ${previewHost}:${port}`),
          );
        } else {
          setTimeout(attempt, 250);
        }
      });
    };

    attempt();
  });
}

function findAvailablePort(startPort, attempts = 20) {
  return new Promise((resolve, reject) => {
    let nextPort = startPort;

    const tryPort = () => {
      const server = net.createServer();
      server.once("error", () => {
        nextPort += 1;
        if (nextPort >= startPort + attempts) {
          reject(
            new Error(
              `no available preview port in ${startPort}-${startPort + attempts - 1}`,
            ),
          );
          return;
        }
        tryPort();
      });
      server.once("listening", () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.listen(nextPort, previewHost);
    };

    tryPort();
  });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: devRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

async function runSmoke(playwrightModule, previewUrl) {
  const { chromium } = require(playwrightModule);
  const chromePath =
    process.env.MD3E_CHROME_PATH || firstExisting(chromeCandidates);
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox"],
    ...(chromePath ? { executablePath: chromePath } : {}),
  };
  const browser = await chromium.launch(launchOptions);

  try {
    for (const viewport of viewportMatrix) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.isMobile,
      });
      await page.goto(previewUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(250);

      const result = await page.evaluate(() => {
        const selectors = [
          "#maincontent",
          "#maincontent > .docs-content",
          ".cbi-tabmenu",
          ".preview-table",
          ".preview-login-stage",
        ];
        const rectFor = (selector) => {
          const node = document.querySelector(selector);
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            selector,
            display: style.display,
            visibility: style.visibility,
            opacity: Number(style.opacity),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        };
        const rects = selectors.map(rectFor).filter(Boolean);
        const visibleRectErrors = rects.filter(
          (rect) =>
            rect.selector !== ".preview-login-stage" &&
            (rect.display === "none" ||
              rect.visibility === "hidden" ||
              rect.opacity === 0 ||
              rect.width <= 0 ||
              rect.height <= 0),
        );
        const viewportWidth = window.innerWidth;
        const overflowErrors = rects.filter(
          (rect) =>
            rect.selector !== ".preview-login-stage" &&
            (rect.left < -2 || rect.right > viewportWidth + 2),
        );
        const pageEnd = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        );
        const footerBottom = Math.round(
          document.querySelector("footer")?.getBoundingClientRect().bottom || 0,
        );
        const docsBottom = Math.round(
          document
            .querySelector("#maincontent > .docs-content")
            ?.getBoundingClientRect().bottom || 0,
        );
        const inactivePanels = Array.from(
          document.querySelectorAll(
            "#maincontent :is(.cbi-map-tabbed, .cbi-section-node-tabbed) > [data-tab-title]:not([data-tab-active='true'])",
          ),
        ).map((panel) => {
          const rect = panel.getBoundingClientRect();
          const style = getComputedStyle(panel);
          return {
            height: Math.round(rect.height),
            overflow: style.overflow,
            visibility: style.visibility,
            pointerEvents: style.pointerEvents,
          };
        });

        return {
          title: document.title,
          layoutMode: document.body.getAttribute("data-layout-mode"),
          headerRect: rectFor("header"),
          desktopNavRect: rectFor("#sidebar-nav-host"),
          rects,
          visibleRectErrors,
          overflowErrors,
          trailingBlank: pageEnd - Math.max(footerBottom, docsBottom),
          inactivePanelErrors: inactivePanels.filter(
            (panel) =>
              panel.height !== 0 ||
              panel.overflow !== "hidden" ||
              panel.visibility !== "hidden" ||
              panel.pointerEvents !== "none",
          ),
        };
      });

      await page.close();

      const expectedLayoutMode = viewport.width <= 920 ? "mobile" : "desktop";
      const errors = [];
      if (!/MD3E|Preview|LuCI|MD3/i.test(result.title)) {
        errors.push(`unexpected title: ${result.title}`);
      }
      if (result.layoutMode !== expectedLayoutMode) {
        errors.push(
          `layout mode ${result.layoutMode}, expected ${expectedLayoutMode}`,
        );
      }
      const navRect =
        expectedLayoutMode === "mobile"
          ? result.headerRect
          : result.desktopNavRect;
      if (
        !navRect ||
        navRect.display === "none" ||
        navRect.visibility === "hidden" ||
        navRect.width <= 0 ||
        navRect.height <= 0
      ) {
        errors.push(
          `${expectedLayoutMode} navigation shell is hidden/empty: ${JSON.stringify(navRect)}`,
        );
      }
      if (result.visibleRectErrors.length) {
        errors.push(
          `hidden/empty critical rects: ${JSON.stringify(result.visibleRectErrors)}`,
        );
      }
      if (result.overflowErrors.length) {
        errors.push(
          `critical rects overflow viewport: ${JSON.stringify(result.overflowErrors)}`,
        );
      }
      if (result.trailingBlank > 160) {
        errors.push(`trailing blank too large: ${result.trailingBlank}px`);
      }
      if (result.inactivePanelErrors.length) {
        errors.push(
          `inactive panels affect layout: ${JSON.stringify(result.inactivePanelErrors)}`,
        );
      }
      if (errors.length) {
        throw new Error(`${viewport.name} failed: ${errors.join("; ")}`);
      }

      console.log(
        `preview smoke ${viewport.name} ok: ${result.layoutMode}, trailingBlank=${result.trailingBlank}`,
      );
    }
  } finally {
    await browser.close();
  }
}

const playwrightModule = resolvePlaywright();
if (!playwrightModule) {
  console.log("preview smoke skipped: Playwright runtime is unavailable");
  process.exit(0);
}

run(process.execPath, [path.join(devRoot, "scripts", "assemble-sources.js")]);

const previewPort = await findAvailablePort(preferredPreviewPort);
const server = spawn(
  process.execPath,
  [
    path.join(devRoot, "node_modules", "vite", "bin", "vite.js"),
    "--mode",
    "local-preview",
    "--host",
    previewHost,
    "--port",
    String(previewPort),
    "--strictPort",
  ],
  {
    cwd: devRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VITE_DEV_HOST: previewHost,
      VITE_DEV_PORT: String(previewPort),
    },
  },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForPort(previewPort);
  await runSmoke(
    playwrightModule,
    `http://${previewHost}:${previewPort}/preview.html`,
  );
} catch (error) {
  console.error(serverOutput.trim());
  throw error;
} finally {
  server.kill();
}
