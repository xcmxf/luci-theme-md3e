# Development Guide

This guide covers the development workflow for the MD3E theme, from environment setup to package-ready build output.

## Prerequisites

- **Node.js 26**
- [**pnpm 12**](https://pnpm.io/installation), pinned by `packageManager` in `package.json`
- **Tailwind CSS knowledge**
- **Network access** to an OpenWrt device when using the live proxy workflow

## Environment Setup

### 1. Clone and Install

```bash
git clone <your-fork-or-repo-url>
cd luci-theme-md3e/.dev/

pnpm install --frozen-lockfile
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set `VITE_OPENWRT_HOST` in `.env` to your router address, for example `http://192.168.1.1`.

## Development Workflow

### Start Development Server

```bash
cd luci-theme-md3e/.dev/
pnpm dev
```

The development server starts on `http://127.0.0.1:5173` by default and proxies requests to the configured OpenWrt host.

### Proxy Behavior

1. `/cgi-bin` and `/luci-static` requests are proxied to the OpenWrt device.
2. CSS requests to `/luci-static/md3e/main.css` are rewritten to `.dev/src/media/main.css`.
3. JS requests under `/luci-static/resources/md3e/` are served from `.dev/src/resource/`. The test device needs the matching theme templates.
4. The dev server injects Vite HMR support into proxied HTML responses.
5. `/` redirects to `/cgi-bin/luci`.

### Live Reload Behavior

- **CSS changes**: full page reload
- **JS changes**: full page reload
- **Template changes** (`.ut`): copy to the router and restart `uhttpd`

### Device-First Visual Verification

For visual changes that target real LuCI pages, verify on the local OpenWrt
device before calling the task done. Use the live dev proxy to check local CSS and JavaScript changes on a configured test device.

Default flow:

1. Build or verify so `htdocs/luci-static/` is current.
2. Copy only the changed generated assets into the device `/www` tree, for
   example `htdocs/luci-static/md3e/main.css` to
   `/www/luci-static/md3e/main.css`.
3. Clear LuCI runtime cache after template or JS changes.
4. For direct `/www` CSS replacement, ensure the served page uses a fresh
   asset cache key. The theme header appends `asset_cache_version` to
   `main.css`; bump the device-side UCI value for local visual checks when
   the package release version is unchanged.
5. Confirm the deployed static asset with an HTTP fetch and hash comparison
   from the workstation.
6. Open the affected LuCI page on the device and check desktop/mobile and
   light/dark rendering when the change can affect layout or contrast.

Keep local device addresses, credentials, temporary captures, and ad hoc logs out of the repository. README screenshots live under the root previews directory.

## Building for Production

### Build Command

```bash
cd luci-theme-md3e/.dev/
pnpm build
```

Build output lands in `../htdocs/luci-static/`.

### Build Output

```text
htdocs/luci-static/
├── md3e/
│   ├── main.css
│   ├── fonts/
│   └── images/
└── resources/md3e/
    └── *.js
```

### Build Process

1. Vite 8 builds and minifies the CSS entry point `src/media/main.css` with Rolldown and Lightning CSS
2. The custom PostCSS step removes `@layer` wrappers for LuCI compatibility
3. Static assets are copied from `.dev/public/md3e/`
4. JS resources are minified independently with Terser

### Tailwind Source Scope

Production Tailwind scanning is allowlisted from `src/media/main/00-tailwind-sources.css` with `source(none)`. Only `ucode/template/themes/md3e`, `.dev/src/media`, and `.dev/src/resource` are scanned. Local docs and screenshots are outside the production source set.

## Maintenance Checks

```bash
cd luci-theme-md3e/.dev/
npm run build
npm run assemble:check
npm run format:check
npm exec -- tsc --noEmit
```

Review the generated changes under `htdocs/luci-static/` alongside the source diff, then check affected pages on OpenWrt. Run `npm run report:asset-sizes` from `.dev` after building to record asset sizes, gzip sizes, and the largest source parts.

The shared mobile/desktop shell breakpoint is maintained in `src/shared/layout-breakpoints.js`. CSS part files and assembled LuCI JS use the documented `__MD3E_MOBILE_LAYOUT_MAX_WIDTH__` / `__MD3E_DESKTOP_LAYOUT_MIN_WIDTH__` tokens, which `scripts/assemble-sources.js` resolves into browser-compatible media query values. The LuCI `header.ut` template keeps one server-side `mobile_layout_max_width` constant for template-local CSS. Keep it aligned with the shared breakpoint when updating the shell.

## Split Source Entries

The development entry files are assembled from smaller source parts. Git tracks the parts and the package-ready files under htdocs/luci-static. Each checkout regenerates the three intermediate entry files locally.

- `src/media/main.css` is assembled from `src/media/main/*.css`.
- `public/md3e/components.css` is assembled from `src/public-md3e/components/*.css`.
- `src/resource/menu-md3e-v2.js` is assembled from `src/resource/menu-md3e-v2/*.js`.

Source part files use two-digit numeric prefixes to make cascade and execution order explicit. Keep names scoped to the responsibility they own, for example `20-layout-shell.css`, `23-tables-forms-segmented.css`, `22-tabs.js`, and `50-root-and-desktop-rendering.js`. When adding or renaming a part, update `scripts/source-assemblies.js` so each source part is included in the build.

After editing source parts, run:

```bash
cd luci-theme-md3e/.dev/
npm run assemble
```

The dev and build scripts run assembly automatically. Run assembly before assemble:check in a fresh checkout.

## Package Compilation

### Local OpenWrt SDK

Download the SDK for the release and target shown by `ubus call system board` on the router. The `.apk` build was verified with the [OpenWrt 25.12.6 x86/64 SDK](https://downloads.openwrt.org/releases/25.12.6/targets/x86/64/) on Ubuntu 24.04. Verify the SDK archive against the published SHA-256, then extract it in a writable directory as a regular user.

On Ubuntu 24.04, install these build dependencies:

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends build-essential bzip2 ca-certificates file flex gawk gettext git libncurses-dev libssl-dev patch perl python3 python3-setuptools rsync unzip wget xz-utils zstd
```

If you changed the frontend, run `pnpm build` in `.dev/` and commit the updated `htdocs/luci-static/` before exporting the package source. From the theme repository root:

```bash
git archive --format=tar --output=../md3e-source.tar HEAD Makefile htdocs root ucode
```

Copy the archive to the SDK machine if needed. From the extracted SDK directory:

```bash
./scripts/feeds update base packages luci
./scripts/feeds install luci-base luasrcdiet csstidy
mkdir -p package/luci-theme-md3e
tar -xf /path/to/md3e-source.tar -C package/luci-theme-md3e
printf '%s\n' 'CONFIG_PACKAGE_luci-theme-md3e=m' > .config
make defconfig
make -j2 package/luci-theme-md3e/compile V=s
find bin/packages -type f -name 'luci-theme-md3e*.apk'
```

The SDK pins feed revisions in `feeds.conf.default`. For feeds already populated at those revisions, use `./scripts/feeds update -i base packages luci` to refresh the indexes. With a reused SDK, replace the theme staging directory with a fresh copy from the archive and run `make package/luci-theme-md3e/clean` before recompiling.

For x86/64 the package is under `bin/packages/x86_64/base/`. The local build produces an unsigned package. Use `staging_dir/host/bin/apk --allow-untrusted verify /path/to/package.apk` to check its integrity. Publishing release assets is a separate manual step.

## Directory Structure

```text
luci-theme-md3e/
├── .dev/
│   ├── docs/
│   │   └── DEVELOPMENT.md
│   ├── public/md3e/
│   ├── scripts/
│   │   └── clean.js
│   ├── src/
│   │   ├── assets/icons/
│   │   ├── media/main/
│   │   ├── public-md3e/components/
│   │   └── resource/
│   ├── .env.example
│   ├── .prettierrc
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── vite.config.ts
├── htdocs/luci-static/
│   ├── md3e/
│   └── resources/md3e/
├── previews/
├── root/etc/uci-defaults/30_luci-theme-md3e
├── ucode/template/themes/md3e/
├── Makefile
└── README.md
```

## Tools and Technologies

- **Tailwind CSS v4**
- **Vite**
- **pnpm**
- **lightningcss**
- **Terser**
- **Prettier**
