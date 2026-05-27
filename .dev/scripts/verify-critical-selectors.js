#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const errors = [];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

function assertIncludes(content, needle, message) {
  if (!content.includes(needle)) errors.push(message);
}

function assertNotMatch(content, pattern, message) {
  if (pattern.test(content)) errors.push(message);
}

const headerTemplate = readProjectFile("ucode/template/themes/md3e/header.ut");
const controlsCss = [
  ".dev/src/media/main/21-controls-theme-switcher.css",
  ".dev/src/media/main/21-controls-buttons.css",
  ".dev/src/media/main/21-controls-page-actions.css",
  ".dev/src/media/main/21-controls-fields.css",
  ".dev/src/media/main/21-controls-dropdown-base.css",
  ".dev/src/media/main/21-controls-dropdown-panels.css",
  ".dev/src/media/main/21-controls-split-button.css",
  ".dev/src/media/main/21-controls-tooltips.css",
]
  .map(readProjectFile)
  .join("\n");
const layoutCss = [
  ".dev/src/media/main/20-layout-theme-header.css",
  ".dev/src/media/main/20-layout-content-shell.css",
  ".dev/src/media/main/20-layout-footer-controls.css",
]
  .map(readProjectFile)
  .join("\n");
const actionGroupsJs = [
  ".dev/src/resource/menu-md3e-v2/41-action-page-groups.js",
  ".dev/src/resource/menu-md3e-v2/41-table-action-markers.js",
  ".dev/src/resource/menu-md3e-v2/41-mobile-action-dirty.js",
]
  .map(readProjectFile)
  .join("\n");
const networkStatusCardsJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/41-network-status-cards.js",
);
const bootstrapLayoutJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/10-bootstrap-layout.js",
);
const customSelectsJs = [
  ".dev/src/resource/menu-md3e-v2/32-custom-select-build.js",
  ".dev/src/resource/menu-md3e-v2/33-custom-select-runtime.js",
]
  .map(readProjectFile)
  .join("\n");
const tabContentMotionJs = [
  ".dev/src/resource/menu-md3e-v2/24-tab-content-click.js",
  ".dev/src/resource/menu-md3e-v2/24-tab-content-height.js",
  ".dev/src/resource/menu-md3e-v2/24-tab-content-view.js",
  ".dev/src/resource/menu-md3e-v2/24-tab-content-state.js",
]
  .map(readProjectFile)
  .join("\n");
const pageOutlineSourceCss = readProjectFile(
  ".dev/src/public-md3e/components/60-page-outline.css",
);
const publicComponentsCss = readProjectFile(".dev/public/md3e/components.css");
const publicTabsCss = readProjectFile(
  ".dev/src/public-md3e/components/50-tabs.css",
);
const publicFormsDropdownsCss = readProjectFile(
  ".dev/src/public-md3e/components/20-forms-dropdowns.css",
);
const publicContentRowsCss = readProjectFile(
  ".dev/src/public-md3e/components/30-content-rows-dynlists.css",
);
const statusCardsCss = [
  ".dev/src/media/main/22-status-card-shared.css",
  ".dev/src/media/main/22-status-network-cards.css",
  ".dev/src/media/main/22-status-port-cards.css",
]
  .map(readProjectFile)
  .join("\n");
const tableLayoutCss = [
  ".dev/src/media/main/23-table-layout.css",
  ".dev/src/media/main/23-table-network-interfaces.css",
]
  .map(readProjectFile)
  .join("\n");
const segmentedTabsCss = readProjectFile(
  ".dev/src/media/main/23-segmented-tabs.css",
);
const pageSectionsCss = readProjectFile(
  ".dev/src/media/main/24-page-sections.css",
);
const feedbackCardsCss = [
  ".dev/src/media/main/22-feedback-messages.css",
  ".dev/src/media/main/22-feedback-sections.css",
]
  .map(readProjectFile)
  .join("\n");
const descriptionSplitButtonJs = [
  ".dev/src/resource/menu-md3e-v2/30-description-placement.js",
  ".dev/src/resource/menu-md3e-v2/30-split-button-dropdowns.js",
]
  .map(readProjectFile)
  .join("\n");
const modalToastJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/21-modal-and-toast.js",
);

assertIncludes(
  headerTemplate,
  "switcher.dataset.activeTheme = current",
  "theme switcher state must be reflected with data-active-theme",
);
assertNotMatch(
  controlsCss,
  /:has\(\.theme-option\[data-theme=["'](?:device|light|dark)["']\]\.active\)/,
  "theme switcher indicator must not rely on :has(.theme-option.active)",
);
assertNotMatch(
  controlsCss,
  /\.cbi-page-actions\s*\{[\s\S]{0,260}(?:@apply(?=[^\n;]*\bsticky\b)(?=[^\n;]*\bbottom-6\b)[^\n;]*|position:\s*sticky\b)/,
  "desktop action areas must stay in normal page flow instead of sticky bottom placement",
);

assertIncludes(
  actionGroupsJs,
  'actions.classList.toggle("md3e-has-split-button", Boolean(splitButton))',
  "split action layout must be marked with .md3e-has-split-button",
);
assertIncludes(
  layoutCss,
  ".cbi-page-actions.md3e-has-split-button",
  "split action layout CSS must use the explicit .md3e-has-split-button class",
);
assertNotMatch(
  layoutCss,
  /\.cbi-page-actions:has\(\s*>\s*:is\(\.md3e-split-button,\s*\[data-md3e-split-button\]\)\)/,
  "split action layout must not rely on .cbi-page-actions:has(...)",
);

assertIncludes(
  networkStatusCardsJs,
  'card.classList.toggle("md3e-network-card", !isPortCard)',
  "network status cards must get an explicit .md3e-network-card class",
);
assertIncludes(
  networkStatusCardsJs,
  'card.classList.toggle("md3e-port-card", isPortCard)',
  "port status cards must get an explicit .md3e-port-card class",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-name")',
  "port status card name must be marked with .md3e-port-name",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-zone")',
  "port status card zone strip must be marked with .md3e-port-zone",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-traffic")',
  "port status card traffic area must be marked with .md3e-port-traffic",
);
assertIncludes(
  statusCardsCss,
  ".md3e-network-card-grid",
  "network status cards must use the MD3E card grid wrapper",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card-grid",
  "port status cards must use the explicit MD3E port card grid wrapper",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card > .md3e-port-name",
  "port status card CSS must use the explicit .md3e-port-name marker",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card > .md3e-port-zone",
  "port status card CSS must use the explicit .md3e-port-zone marker",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card .md3e-port-traffic",
  "port status card CSS must use the explicit .md3e-port-traffic marker",
);
assertNotMatch(
  statusCardsCss,
  /\.md3e-network-card[^{]*\{[\s\S]{0,520}width:\s*fit-content\b/,
  "network status cards must not shrink to fit-content on mobile",
);
assertNotMatch(
  statusCardsCss,
  /\.ifacebox:has\(\s*>\s*\.ifacebox-head\.cbi-tooltip-container\)/,
  "port status cards must not rely on .ifacebox:has(...) fallback selectors",
);
assertIncludes(
  descriptionSplitButtonJs,
  'setValueClass(field, "md3e-value-field-localtime", hasLocalTime)',
  "localtime controls must get an explicit .md3e-value-field-localtime class",
);
assertIncludes(
  descriptionSplitButtonJs,
  'setValueClass(row, "md3e-value-dropdown-open", hasOpenDropdown)',
  "open dropdown rows must get an explicit .md3e-value-dropdown-open class",
);
assertIncludes(
  descriptionSplitButtonJs,
  'setValueClass(row, "md3e-value-rich-content", hasRichContent)',
  "rich form rows must get an explicit .md3e-value-rich-content class",
);
assertIncludes(
  descriptionSplitButtonJs,
  'setValueClass(field, "md3e-value-field-dropdown-open", hasOpenDropdown)',
  "open dropdown fields must get an explicit .md3e-value-field-dropdown-open class",
);
assertIncludes(
  publicFormsDropdownsCss,
  ".cbi-value.md3e-value-dropdown-open",
  "public dropdown CSS must use the explicit .md3e-value-dropdown-open class",
);
assertIncludes(
  publicFormsDropdownsCss,
  ".cbi-value-field.md3e-value-field-dropdown-open",
  "public dropdown CSS must use the explicit .md3e-value-field-dropdown-open class",
);
assertNotMatch(
  publicFormsDropdownsCss,
  /:has\(\.outline-select\.open,\s*\.cbi-dropdown\[open\]\)/,
  "public dropdown stacking must not rely on :has(.outline-select.open, .cbi-dropdown[open])",
);
assertIncludes(
  publicContentRowsCss,
  ".cbi-value.md3e-value-rich-content",
  "public content row CSS must use the explicit .md3e-value-rich-content class",
);
assertNotMatch(
  publicContentRowsCss,
  /\.cbi-value:has\(\.cbi-value-description,\s*textarea,\s*select,\s*\.cbi-dropdown,\s*\.outline-select,\s*\.cbi-button\)/,
  "public content row spacing must not rely on .cbi-value:has(...)",
);
assertIncludes(
  controlsCss,
  ".cbi-value-field.md3e-value-field-localtime",
  "localtime button CSS must use the explicit .md3e-value-field-localtime class",
);
assertNotMatch(
  controlsCss,
  /\.cbi-value-field:has\(#localtime\)/,
  "localtime button CSS must not rely on .cbi-value-field:has(#localtime)",
);

assertIncludes(
  tableLayoutCss,
  '[data-page="admin-network-network"] &',
  "network interfaces table must keep page-scoped responsive badge layout",
);
assertIncludes(
  tableLayoutCss,
  "& .ifacebox-body .cbi-tooltip.ifacebadge.large",
  "network interface badge tooltip must stay out of normal icon flow",
);
assertIncludes(
  tableLayoutCss,
  '&[data-name="_ifacestat"]',
  "network interface status details must keep the redesigned compact card",
);
assertIncludes(
  tableLayoutCss,
  "max-md:flex-none",
  "network interface cells must not shrink and squeeze redesigned badges on mobile",
);
assertIncludes(
  tableLayoutCss,
  ".md3e-interface-row",
  "network interface rows must use explicit JS markers for mobile redesign",
);
assertIncludes(
  tableLayoutCss,
  "grid-template-columns: minmax(0, 1fr) !important",
  "network interface row grid must override LuCI's generated multi-column table layout",
);
assertIncludes(
  networkStatusCardsJs,
  'row.classList.add("md3e-interface-row")',
  "network interface row marker must be applied by the LuCI runtime enhancer",
);
assertIncludes(
  bootstrapLayoutJs,
  "observeDomMutations(target, subscriberKey, callback",
  "runtime modules must use the shared DOM mutation hub for target-level observers",
);
assertIncludes(
  networkStatusCardsJs,
  'this.observeDomMutations(target, "network-status-cards"',
  "network status cards must subscribe to the shared mutation hub",
);
assertIncludes(
  actionGroupsJs,
  'this.observeDomMutations(target, "action-button-groups"',
  "action button groups must subscribe to the shared mutation hub",
);
assertIncludes(
  actionGroupsJs,
  "md3e-row-action-cluster",
  "row action button clusters must get an explicit marker class",
);
assertIncludes(
  actionGroupsJs,
  "md3e-table-action-cell",
  "table action cells must get an explicit marker class",
);
assertIncludes(
  actionGroupsJs,
  "md3e-table-has-data-title",
  "tables with data-title cells must get an explicit marker class",
);
assertIncludes(
  actionGroupsJs,
  "md3e-table-data-title-row",
  "table rows with data-title cells must get an explicit marker class",
);
assertIncludes(
  tableLayoutCss,
  ".md3e-row-action-cluster",
  "row action button cluster CSS must use the explicit marker class",
);
assertIncludes(
  publicTabsCss,
  ".md3e-table-action-cell",
  "public table action CSS must use the explicit .md3e-table-action-cell class",
);
assertIncludes(
  publicTabsCss,
  ".md3e-table-has-data-title",
  "public table title CSS must use the explicit .md3e-table-has-data-title class",
);
assertIncludes(
  publicTabsCss,
  ".md3e-table-data-title-row",
  "public table data-title CSS must use the explicit .md3e-table-data-title-row class",
);
assertIncludes(
  segmentedTabsCss,
  ".md3e-tab-panel-hidden",
  "hidden LuCI tab panels must use an explicit runtime marker class",
);
assertIncludes(
  tabContentMotionJs,
  "syncTabPanelState",
  "tab content runtime must sync explicit active/hidden panel classes",
);
assertIncludes(
  tabContentMotionJs,
  "md3e-tab-panel-hidden",
  "tab content runtime must mark inactive panels explicitly",
);
assertIncludes(
  segmentedTabsCss,
  '#maincontent :is(.cbi-map-tabbed, .cbi-section-node-tabbed) > [data-tab-title]:not([data-tab-active="true"])',
  "hidden LuCI tab panels must be clipped so inactive content cannot extend mobile page scroll height",
);
assertIncludes(
  segmentedTabsCss,
  "margin-block: 0 !important",
  "hidden LuCI tab panels must not leave inactive tab margin in page flow",
);
assertIncludes(
  segmentedTabsCss,
  "overflow: hidden !important",
  "hidden LuCI tab panels must override generic cbi-section overflow-visible rules",
);
assertNotMatch(
  tableLayoutCss,
  />\s*div:has\(\s*>\s*:is\(\.cbi-button,\s*\.btn,\s*button,\s*a\.btn,\s*input\.btn\)\)/,
  "row action button cluster CSS must not rely on div:has(> button)",
);
assertNotMatch(
  publicTabsCss,
  /:has\(/,
  "public table/tab CSS must not rely on :has() for table state",
);
assertIncludes(
  descriptionSplitButtonJs,
  'setValueClass(row, "md3e-value-has-progress", hasProgress)',
  "progress value rows must get an explicit .md3e-value-has-progress class",
);
assertIncludes(
  pageSectionsCss,
  ".md3e-value-field-progress",
  "page section progress field CSS must use an explicit progress class",
);
assertIncludes(
  pageSectionsCss,
  ".md3e-value-has-progress",
  "page section row layout CSS must use an explicit progress class",
);
assertNotMatch(
  pageSectionsCss,
  /:has\(\.progress\)|:has\(\.cbi-progressbar\)/,
  "page section progress layout must not rely on :has(.progress/.cbi-progressbar)",
);
assertIncludes(
  modalToastJs,
  "md3e-toast-has-close",
  "toasts with close controls must get an explicit marker class",
);
assertIncludes(
  modalToastJs,
  "md3e-alert-checkbox-wrap",
  "alert checkbox wrappers must get an explicit marker class",
);
assertIncludes(
  feedbackCardsCss,
  ".md3e-toast-has-close",
  "toast close spacing CSS must use an explicit marker class",
);
assertIncludes(
  feedbackCardsCss,
  ".md3e-toast-close-wrap",
  "toast close wrapper CSS must use an explicit marker class",
);
assertIncludes(
  feedbackCardsCss,
  ".md3e-alert-checkbox-wrap",
  "alert checkbox CSS must use an explicit marker class",
);
assertNotMatch(
  feedbackCardsCss,
  /:has\(/,
  "feedback card/toast CSS must not rely on :has()",
);
assertIncludes(
  customSelectsJs,
  '"custom-selects"',
  "custom selects must subscribe to the shared mutation hub",
);
assertIncludes(
  customSelectsJs,
  'const method = hasOpen ? "addEventListener" : "removeEventListener"',
  "dropdown viewport listeners must be attached only while a dropdown is open",
);
assertIncludes(
  customSelectsJs,
  "this._activeOutlineSelect",
  "custom select click handling must track the active outline select instead of scanning every click",
);
assertNotMatch(
  customSelectsJs,
  /window\.addEventListener\("scroll",\s*this\._dropdownViewportHandler,\s*true\)/,
  "dropdown scroll listener must not be installed permanently during init",
);

const navShellHas =
  /\bbody\[data-layout-mode=["']desktop["']\][^{,]*:has\(\.md3e-nav-shell\.is-expanded\)/;
assertNotMatch(
  pageOutlineSourceCss,
  navShellHas,
  "page-outline source CSS must use explicit nav-expanded state instead of body:has(.md3e-nav-shell.is-expanded)",
);
assertNotMatch(
  publicComponentsCss,
  navShellHas,
  "assembled components CSS must use explicit nav-expanded state instead of body:has(.md3e-nav-shell.is-expanded)",
);

if (errors.length) {
  throw new Error(
    `critical selector verification failed:\n${errors.join("\n")}`,
  );
}

console.log("critical selectors ok");
