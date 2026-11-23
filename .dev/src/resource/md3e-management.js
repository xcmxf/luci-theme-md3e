"use strict";
"require baseclass";
"require ui";
"require md3e.menu-md3e-v2 as theme";

const interfaceActions = [
  {
    selector: ".reconnect",
    title: _("Restart interface %s?"),
    message: _(
      "Restarting this interface may temporarily interrupt its connections.",
    ),
  },
  // LuCI checks the inbound interface and confirms a potential disconnect.
  { selector: ".down", danger: true },
  {
    selector: ".cbi-button-remove",
    danger: true,
    title: _("Delete interface %s?"),
    message: _(
      "This removes the interface from the pending configuration. Use Save & Apply to apply the removal.",
    ),
  },
];
const firewallActions = [
  { selector: "button.cbi-button-neutral[title]" },
  {
    selector: ".cbi-button-remove",
    danger: true,
    title: _("Delete firewall entry %s?"),
    message: _(
      "This removes the entry from the pending firewall configuration. Use Save & Apply to apply the removal.",
    ),
  },
];
const statusSelector = '[data-name="_ifacestat"] > div';

function styleRoutingTables(view) {
  const title = view.querySelector(":scope > h2:first-child");
  if (title?.textContent.trim() === _("Routing")) {
    title.classList.add("md3e-routing-copy");
    title.hidden = true;
    const intro = title.nextElementSibling;
    if (
      intro?.matches("p") &&
      intro.textContent.trim() ===
        _("The following rules are currently active on this system.")
    ) {
      intro.classList.add("md3e-routing-copy");
      intro.hidden = true;
    }
  }

  for (const panel of view.querySelectorAll(
    ":scope > div > :is([data-tab=ipv4routing], [data-tab=ipv6routing])",
  )) {
    panel.classList.add("md3e-routing-panel");
    for (const heading of panel.querySelectorAll(":scope > h3")) {
      const table = heading.nextElementSibling;
      if (!table?.matches("table")) continue;

      const group = E("section", {
        class: "cbi-section md3e-parameter-group md3e-data-group",
      });
      heading.before(group);
      heading.setAttribute("aria-level", "2");
      group.append(
        E("div", { class: "cbi-title" }, heading),
        table,
        E(
          "p",
          { class: "md3e-data-scroll-hint" },
          _("Scroll horizontally to see all columns"),
        ),
      );
    }

    for (const group of panel.querySelectorAll(":scope > .md3e-data-group")) {
      const table = group.querySelector(
        ":scope > table, :scope > .md3e-data-scroll > table",
      );
      const heading = group.querySelector(":scope > .cbi-title > h3");
      if (table && heading) styleRoutingTable(table, heading.textContent.trim());
    }
  }

  const tabs = view.querySelector(":scope > .cbi-tabmenu");
  if (!tabs) return;
  tabs.classList.add("md3e-routing-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", _("Routing"));
  for (const item of tabs.querySelectorAll(":scope > li[data-tab]")) {
    const tab = item.firstElementChild;
    const panel = view.querySelector(
      `:scope > div > .md3e-routing-panel[data-tab="${CSS.escape(item.dataset.tab)}"]`,
    );
    if (!tab?.matches("a") || !panel) continue;
    const id = `md3e-${item.dataset.tab}`;
    const selected = panel.dataset.tabActive === "true";
    item.setAttribute("role", "presentation");
    tab.id = `${id}-tab`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", id);
    tab.setAttribute("aria-selected", selected);
    tab.tabIndex = selected ? 0 : -1;
    panel.id = id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
  }
}

function styleRoutingTable(table, label) {
  const headers = Array.from(table.rows[0]?.cells ?? []);
  const labels = headers.map((header) => header.textContent.trim());
  const layout = labels.includes(_("Target"))
    ? "wide"
    : labels.includes(_("MAC address"))
      ? "medium"
      : "fluid";
  const scroll = styleDataTable(table, label, layout);
  // Empty tables have no horizontal content to explore with the keyboard.
  scroll.tabIndex = table.classList.contains("md3e-table-empty") ? -1 : 0;
  const address = [
    _("IP address"),
    _("MAC address"),
    _("Target"),
    _("Gateway"),
    _("Source"),
  ];
  const numeric = [_("Metric"), _("Priority")];
  headers.forEach((header, index) => {
    if (!header.matches("th")) return;
    const label = labels[index];
    const kind = address.includes(label)
      ? "address"
      : numeric.includes(label)
        ? "number"
        : null;
    if (kind) {
      for (const row of table.rows) {
        const cell = row.cells[index];
        if (cell && !row.classList.contains("placeholder"))
          cell.dataset.md3eColumn = kind;
      }
    }

    if (!header.hasAttribute("data-sortable-row")) return;
    header.tabIndex = 0;
    const order = header.dataset.sortDirection;
    if (order)
      header.setAttribute(
        "aria-sort",
        order === "asc" ? "ascending" : "descending",
      );
    else header.removeAttribute("aria-sort");
  });
}

function handleRoutingKeys(event) {
  const target = event.target;
  if (
    target.matches(".md3e-data-scroll th[data-sortable-row]") &&
    ["Enter", " "].includes(event.key)
  ) {
    event.preventDefault();
    target.click();
    return;
  }
  if (!target.matches(".md3e-routing-tabs [role=tab]")) return;
  const tabs = Array.from(
    target.closest("[role=tablist]").querySelectorAll("[role=tab]"),
  );
  const index = tabs.indexOf(target);
  const rtl = getComputedStyle(target).direction === "rtl";
  const offsets = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 };
  const next =
    event.key === "Home"
      ? tabs[0]
      : event.key === "End"
        ? tabs.at(-1)
        : offsets[event.key]
          ? tabs[(index + offsets[event.key] + tabs.length) % tabs.length]
          : event.key === " "
            ? target
            : null;
  if (!next) return;
  event.preventDefault();
  next.click();
  next.focus();
}


function styleNftables(view) {
  for (const chain of view.querySelectorAll(".nft-chain")) {
    chain.classList.add("md3e-parameter-group", "md3e-data-group", "md3e-nft-chain");
    const table = chain.querySelector(".nft-rules");
    if (table)
      styleDataTable(table, chain.querySelector("h4")?.textContent.trim() || _("Firewall rules"));

    chain.querySelectorAll(".nft-rules tr").forEach((row) => {
      const actionCell = row.cells[1];
      if (!actionCell) return;
      actionCell.querySelectorAll(".ifacebadge").forEach((badge) => {
        const text = badge.textContent.trim();
        const lower = text.toLowerCase();
        const matchesAny = (candidates) =>
          candidates.some((c) => c && (lower === c.toLowerCase() || lower.startsWith(c.toLowerCase())));
        if (/^Accept/i.test(text) || matchesAny([_("Accept"), _("Accept packets")])) {
          badge.classList.add("md3e-nft-accept");
        } else if (/^Drop/i.test(text) || matchesAny([_("Drop"), _("Drop packets")])) {
          badge.classList.add("md3e-nft-drop");
        } else if (/^Reject/i.test(text) || matchesAny([_("Reject"), _("Reject packets")])) {
          badge.classList.add("md3e-nft-reject");
        } else {
          badge.classList.add("md3e-nft-jump");
        }
      });
    });
  }
}

function precedingHeadingLabel(table) {
  // LuCI renders the lease tables under a visible <h4>; reuse that translated
  // label so the scroll region is announced with the same text.
  for (let node = table, depth = 0; node && depth < 3; depth++) {
    for (
      let sibling = node.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      const heading = sibling.matches("h2, h3, h4")
        ? sibling
        : sibling.querySelector(":scope > h2, :scope > h3, :scope > h4");
      const label = heading?.textContent.trim();
      if (label) return label;
    }
    node = node.parentElement;
  }
  return "";
}

// LuCI's native CBI grids render their column labels as a header row and their
// empty state as a single placeholder cell. Both are chrome, not data, so the
// empty-state detection below skips them.
const nativeTableHeaderSelector =
  "tr.table-titles, tr.cbi-section-table-titles, .tr.table-titles, .tr.cbi-section-table-titles, thead tr, .thead .tr";

function getTableRows(table) {
  if (!table) return [];
  if (table.rows && table.rows.length) return [...table.rows];
  return Array.from(
    table.querySelectorAll(":scope > tr, :scope > tbody > tr, :scope > thead > tr, :scope > .tr, :scope > .tbody > .tr, :scope > .thead > .tr"),
  );
}

function getRowCells(row) {
  if (!row) return [];
  if (row.cells && row.cells.length) return [...row.cells];
  return Array.from(row.children).filter((c) => c.matches("th, td, .th, .td"));
}

function nativeTableDataRows(table) {
  return getTableRows(table).filter(
    (row) =>
      !row.closest("thead, .thead") &&
      !row.classList.contains("placeholder") &&
      !row.classList.contains("table-titles") &&
      !row.classList.contains("cbi-section-table-titles"),
  );
}

function styleDataTable(table, label, preferredLayout) {
  let scroll = table.parentElement;
  if (!scroll.classList.contains("md3e-data-scroll")) {
    scroll = E("div", {
      class: "md3e-data-scroll md3e-native-grid",
      role: "region",
      tabindex: 0,
      "aria-label": label || table.getAttribute("aria-label") || _("Data table"),
    });
    table.before(scroll);
    scroll.append(table);
  } else {
    scroll.classList.add("md3e-native-grid");
    if (label && !scroll.getAttribute("aria-label"))
      scroll.setAttribute("aria-label", label);
  }

  const header = table.querySelector(nativeTableHeaderSelector);
  const columns = getRowCells(header).length || 0;
  header?.querySelectorAll("th").forEach((cell) => {
    cell.scope = "col";
  });

  // LuCI renders the empty state as one cell; span it over the real column
  // count so the localized text stays readable instead of wrapping one
  // character per line.
  const placeholder = table.querySelector("tr.placeholder > td, .tr.placeholder > .td");
  if (placeholder && columns > 1 && placeholder.colSpan !== columns)
    placeholder.colSpan = columns;

  // Opt-in state shared with the stylesheet: an empty grid keeps its header row
  // and placeholder out of the data count so the CSS can drop the minimum width
  // and the column labels without touching populated tables.
  const empty = !!placeholder && nativeTableDataRows(table).length === 0;
  table.classList.toggle("md3e-table-empty", empty);

  // Column count drives the shared --md3e-table-min hooks: wide grids keep a
  // readable floor, medium ones a smaller one, and empty grids clear it so the
  // placeholder cell is not scrolled inside a blank grid.
  const layout = empty
    ? ""
    : preferredLayout ?? (columns >= 5 ? "wide" : columns >= 4 ? "medium" : "");
  if (layout) scroll.dataset.layout = layout;
  else delete scroll.dataset.layout;
  return scroll;
}

function styleNativeTable(table, label) {
  table.closest(".cbi-value, .cbi-section")?.classList.add("md3e-data-group");
  styleDataTable(table, label);
}

function styleTonalSettingsTabs(view, sectionSelector, secondary = false) {
  for (const tabs of view.querySelectorAll(sectionSelector)) {
    tabs.classList.add("md3e-tonal-shell");
    if (secondary && tabs.previousElementSibling?.matches(".cbi-tabmenu"))
      tabs.previousElementSibling.classList.add("md3e-secondary-tabs");
    for (const panel of tabs.querySelectorAll(":scope > [data-tab]")) {
      if (panel.querySelector(":scope > .cbi-value > .cbi-value-field"))
        panel.classList.add("md3e-tonal-settings");
    }
  }
}

function markTonalNativeSettings(view, page) {
  const selectors = {
    "admin-system-admin":
      ".cbi-map .cbi-section:has(> .cbi-section-node > .cbi-value)",
    "admin-system-admin-dropbear": "#cbi-dropbear-dropbear",
    "admin-system-admin-uhttpd":
      ".cbi-map .cbi-section:has(> .cbi-section-node > .cbi-value > .cbi-value-field)",
    "admin-system-attendedsysupgrade-configuration":
      ".cbi-section:is(#cbi-attendedsysupgrade-server, #cbi-attendedsysupgrade-client)",
  };
  const selector = selectors[page];
  if (!selector) return;
  view.querySelectorAll(selector).forEach((section) => {
    section.classList.add("md3e-tonal-settings");
  });
}

function editorMapId(page) {
  if (/^admin-network-firewall(?:-|$)/.test(page)) return "cbi-firewall";
  return {
    "admin-network-network": "cbi-network",
    "admin-network-routes": "cbi-network",
    "admin-network-switch": "cbi-network",
    "admin-network-wireless": "cbi-wireless",
    "admin-network-dhcp": "cbi-dhcp",
    "admin-network-dns": "cbi-dhcp",
    "admin-system-mounts": "cbi-fstab",
    "admin-system-leds": "cbi-system",
  }[page];
}

function styleDhcpLeases(view) {
  const leases = view.querySelector("#cbi-dhcp-__leases__ > .cbi-section-node");
  leases?.classList.add("md3e-tonal-shell");

  const staticGrid = leases?.querySelector("#cbi-dhcp-host");
  const staticGroup = staticGrid?.closest(".cbi-value");
  if (staticGroup) {
    staticGroup.classList.add("md3e-tonal-data");
    if (!staticGroup.querySelector(":scope > h3"))
      staticGroup.prepend(E("h3", {}, _("Static Leases")));

    const help = staticGrid.querySelector(":scope > .cbi-section-descr");
    if (help?.textContent.trim() && !help.querySelector(":scope > details")) {
      help.append(E("details", { class: "md3e-data-help" }, [
        E("summary", {}, _("Help")),
        ...help.childNodes,
      ]));
    }
  }

  const leaseTables = [
    ["#lease_status_table", _("Active DHCPv4 Leases")],
    ["#lease6_status_table", _("Active DHCPv6 Leases")],
    ["#cbi-dhcp-host > table, #cbi-dhcp-host > .md3e-data-scroll > table", null],
  ];

  for (const [selector, headingFallback] of leaseTables) {
    const table = view.querySelector(selector);
    if (!table) continue;

    // The lease tables carry a visible <h4>; the static grid has none, so it
    // keeps the localized fallback chain.
    const holder = table.closest(".cbi-value, .cbi-section");
    if (headingFallback) holder?.classList.add("md3e-tonal-data");
    const label =
      (headingFallback && precedingHeadingLabel(table)) ||
      holder
        ?.querySelector(".cbi-value-title, .cbi-title > h3")
        ?.textContent.trim() ||
      headingFallback ||
      _("Static Leases");
    styleNativeTable(table, label);
  }
}

const dnsRecordTables = [
  ["cbi-dhcp-domain", _("Hostnames")],
  ["cbi-dhcp-srvhost", _("SRV records")],
  ["cbi-dhcp-mxhost", _("MX records")],
  ["cbi-dhcp-cname", _("CNAME records")],
  ["cbi-dhcp-dnsrr", _("Additional DNS records")],
  ["cbi-dhcp-ipset", _("IP sets")],
];

function styleDnsRecords(view) {
  const records = view.querySelector("#cbi-dhcp-__dnsrecords__");
  records?.closest(".cbi-value")?.classList.add("md3e-tonal-shell");
  records?.querySelector(":scope > .cbi-tabmenu")?.classList.add("md3e-secondary-tabs");
  records?.querySelector(":scope > .cbi-section-node-tabbed")?.classList.add("md3e-tonal-shell");

  for (const [id, fallback] of dnsRecordTables) {
    const grid = view.querySelector(`#${id}`);
    if (!grid) continue;
    const table = grid.matches("table")
      ? grid
      : grid.querySelector(
          ":scope > table, :scope > .md3e-data-scroll > table, table.cbi-section-table",
        );
    if (!table) continue;

    // The DNS grids keep their own headings and row actions; only the scroll
    // region and the empty state are added around the native table.
    const holder = grid.closest(".cbi-value, .cbi-section") || grid;
    holder.classList.add("md3e-tonal-data");
    if (holder.parentElement?.matches(".cbi-value"))
      holder.parentElement.classList.add("md3e-tonal-shell");
    const label =
      grid
        .querySelector(":scope > h3, :scope > h4, :scope > .cbi-section-title")
        ?.textContent.trim() ||
      holder
        .querySelector(".cbi-value-title, .cbi-title > h3")
        ?.textContent.trim() ||
      fallback;
    styleNativeTable(table, label);
  }
}

function styleStaticRoutes(view) {
  const sections = ":is(#cbi-network-route, #cbi-network-route6, #cbi-network-rule, #cbi-network-rule6)";
  view.querySelectorAll(sections).forEach((section) => section.classList.add("md3e-tonal-data"));
  styleCbiDataTables(view, sections, _("Static Routes"));
}

function styleFirewallGrids(view) {
  const sections = [
    ["#cbi-firewall-zone", _("Zones")],
    ["#cbi-firewall-redirect", _("Port Forwards"), true],
    ["#cbi-firewall-rule", _("Traffic Rules"), true],
    ["#cbi-firewall-nat", _("NAT Rules"), true],
    ["#cbi-firewall-ipset", _("IP Sets")],
  ];
  for (const [selector, label, rules] of sections) {
    const section = view.querySelector(selector);
    if (!section) continue;
    section.classList.add("md3e-tonal-data");
    if (rules) section.classList.add("md3e-record-list");
    styleCbiDataTables(view, selector, label);
  }
}

function styleNetworkTables(view) {
  view.querySelector("#cbi-network-interface")?.classList.add("md3e-tonal-data");
  view.querySelector("#cbi-network-device")?.classList.add("md3e-tonal-data");
  view.querySelector("#cbi-network-globals")?.classList.add("md3e-tonal-settings");
  styleCbiDataTables(view, "#cbi-network-device", _("Devices"));
}

function styleDhcpServiceTables(view) {
  const sections = [
    ["relay", _("Relay")],
    ["tag", _("Match Tags")],
    ["match", _("Set Tags")],
    ["vendorclass", _("VC")],
    ["userclass", _("UC")],
    ["boot", _("PXE/TFTP")],
    ["boot6", _("PXE over IPv6")],
  ];
  for (const [name, label] of sections) {
    const selector = `#cbi-dhcp-${name}`;
    const section = view.querySelector(selector);
    if (!section) continue;

    section.classList.add("md3e-dhcp-service-table");
    const group = section.closest(".cbi-value") || section;
    group.classList.add(
      group.closest(".md3e-tonal-settings") ? "md3e-tonal-shell" : "md3e-tonal-data",
    );
    styleCbiDataTables(view, selector, label);
  }
}

function styleCbiDataTables(view, sectionSelector, fallback) {
  const tables = view.querySelectorAll(
    `${sectionSelector} > table.cbi-section-table, ${sectionSelector} > .md3e-data-scroll > table.cbi-section-table`,
  );
  for (const table of tables) {
    styleNativeTable(table, precedingHeadingLabel(table) || fallback);
  }
}

function styleMounts(view) {
  const mounted = view.querySelector('#cbi-fstab [id$="-_mtab"] table.table');
  if (mounted) {
    styleNativeTable(mounted, precedingHeadingLabel(mounted) || _("Mounted file systems"));
  }
  for (const section of view.querySelectorAll("#cbi-fstab-mount, #cbi-fstab-swap"))
    section.classList.add("md3e-tonal-data");
  mounted?.closest(".cbi-section")?.classList.add("md3e-tonal-data");
  styleCbiDataTables(view, "#cbi-fstab-mount", _("Mount Points"));
  styleCbiDataTables(view, "#cbi-fstab-swap", _("SWAP"));
}

function syncTableDataTitles(table) {
  const header = table.querySelector(nativeTableHeaderSelector);
  if (!header) return;
  const labels = getRowCells(header).map((cell) =>
    cell.textContent.trim(),
  );
  let tableHasDataTitle = false;

  for (const row of nativeTableDataRows(table)) {
    let rowHasDataTitle = false;
    getRowCells(row).forEach((cell, index) => {
      const label = labels[index] || "";
      if (label) {
        if (cell.getAttribute("data-title") !== label) {
          cell.setAttribute("data-title", label);
        }
        cell.classList.add("md3e-table-data-title-cell");
        rowHasDataTitle = true;
        tableHasDataTitle = true;
      }
      if (cell.querySelector(".cbi-button, .btn, button")) {
        cell.classList.add("md3e-table-action-cell");
      }
    });
    row.classList.toggle("md3e-table-data-title-row", rowHasDataTitle);
  }

  if (tableHasDataTitle) {
    table.classList.add("md3e-table-has-data-title");
  }
}

function structureWirelessInfoCell(cell) {
  if (!(cell instanceof HTMLElement)) return;
  if (cell.querySelector("a, button, input, select, textarea")) return;

  // Preserve LuCI native direct-child wrapper <div> (with its data-* attributes)
  // so LuCI poll handlers calling getAttribute() on the child <div> (e.g. Mesh rows)
  // never break.
  const firstEl = cell.firstElementChild;
  const container =
    cell.children.length === 1 &&
    firstEl instanceof HTMLElement &&
    firstEl.tagName === "DIV" &&
    !firstEl.classList.contains("md3e-wireless-card-title") &&
    !firstEl.classList.contains("md3e-wireless-card-badges")
      ? firstEl
      : cell;

  if (
    container.querySelector(
      ":scope > .md3e-wireless-spec-grid, :scope > .md3e-wireless-card-title, :scope > .md3e-wireless-card-badges, :scope > .md3e-wireless-card-note",
    )
  ) {
    return;
  }

  const badges = [];
  const segments = [];
  let current = null;
  let titleText = "";

  const pushSegment = (endedByInlineKey = false) => {
    if (!current) return;
    current.endedByInlineKey = endedByInlineKey;
    if (current.key !== null || current.raw.trim()) {
      segments.push(current);
    }
    current = null;
  };

  const ensureTextSegment = () => {
    if (!current) current = { key: null, raw: "", endedByInlineKey: false };
  };

  const walk = (node) => {
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (!text) return;
      if (!current && !text.trim()) return;
      ensureTextSegment();
      current.raw += text;
      return;
    }
    if (node.nodeType !== 1) return;

    if (node.classList.contains("ifacebadge")) {
      badges.push(node);
      return;
    }
    if (node.tagName === "BR") {
      pushSegment(false);
      return;
    }
    if (node.tagName === "STRONG" || node.tagName === "B") {
      const rawKey = node.textContent;
      const text = rawKey.trim();
      if (!text) return;
      if (text.endsWith(":")) {
        pushSegment(true);
        current = {
          key: text.slice(0, -1).trim(),
          raw: "",
          endedByInlineKey: false,
          keyHadTrailingSpace: /:\s+$/.test(rawKey),
        };
        return;
      }
      if (!titleText && !current && node.closest("big")) {
        titleText = text;
        return;
      }
      if (!titleText && !current && !segments.length) {
        titleText = text;
        return;
      }
      ensureTextSegment();
      current.raw += text;
      return;
    }
    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(container.childNodes).forEach(walk);
  pushSegment(false);

  const specs = [];
  const notes = [];
  for (const seg of segments) {
    if (seg.key !== null) {
      let value = seg.keyHadTrailingSpace ? seg.raw : seg.raw.replace(/^ /, "");
      if (seg.endedByInlineKey) {
        value = value.replace(/ \| $/, "");
      }
      if (value.trim()) specs.push({ key: seg.key, value });
      continue;
    }

    const joined = seg.raw.trim();
    if (!joined) continue;

    // Plain-text multi-spec lines (without <strong>) only split on " | " when
    // every piece is a valid Key: Value pair.
    const pipeParts = joined.includes(" | ") ? joined.split(" | ") : null;
    if (
      pipeParts &&
      pipeParts.length > 1 &&
      pipeParts.every((p) => /^([^:]{1,40}):\s*(.+)$/.test(p.trim()))
    ) {
      for (const p of pipeParts) {
        const m = p.trim().match(/^([^:]{1,40}):\s*(.+)$/);
        if (m) specs.push({ key: m[1].trim(), value: m[2].trim() });
      }
      continue;
    }

    const match = joined.match(/^([^:]{1,40}):\s*(.+)$/);
    if (match) {
      specs.push({ key: match[1].trim(), value: match[2].trim() });
    } else {
      notes.push(joined);
    }
  }

  // Extract SSID into card title when no hardware title was present.
  const remainingSpecs = [];
  for (const spec of specs) {
    if (!titleText && spec.key.toLowerCase() === "ssid") {
      titleText = spec.value;
    } else {
      remainingSpecs.push(spec);
    }
  }

  // Only replace DOM when we parsed structured specs, notes, title, or standalone badges.
  const hasContent =
    Boolean(titleText) ||
    badges.length > 0 ||
    remainingSpecs.length > 0 ||
    notes.length > 0;
  if (!hasContent) return;

  const fragment = document.createDocumentFragment();

  if (titleText) {
    fragment.appendChild(
      E("div", { class: "md3e-wireless-card-title" }, [titleText]),
    );
  }

  if (badges.length) {
    fragment.appendChild(
      E("div", { class: "md3e-wireless-card-badges" }, badges),
    );
  }

  for (const note of notes) {
    fragment.appendChild(
      E("p", { class: "md3e-wireless-card-note" }, [note]),
    );
  }

  if (remainingSpecs.length) {
    const dl = E("dl", { class: "md3e-wireless-spec-grid" });
    for (const { key, value } of remainingSpecs) {
      const lowerKey = key.toLowerCase();
      const isWide =
        lowerKey === "encryption" ||
        lowerKey === "加密" ||
        value.length > 28;
      dl.appendChild(
        E(
          "div",
          {
            class: isWide
              ? "md3e-wireless-spec-item is-wide"
              : "md3e-wireless-spec-item",
          },
          [E("dt", {}, [key]), E("dd", {}, [value])],
        ),
      );
    }
    fragment.appendChild(dl);
  }

  container.replaceChildren(fragment);
}

// Wireless Overview renders two native grids: the associated-station list and
// the radio table inside the Wireless Overview GridSection. Both keep their
// native markup and handlers; mobile stacking and wrapping are driven by these
// classes without forcing horizontal scroll.
function styleWireless(view) {
  const stations = view.querySelector("#wifi_assoclist_table");
  if (stations) {
    stations.closest(".cbi-section")?.classList.add("md3e-tonal-data");
    styleNativeTable(
      stations,
      precedingHeadingLabel(stations) || _("Associated Stations"),
    );
    stations.classList.add("md3e-wireless-stations-table");
    syncTableDataTitles(stations);
  }

  const radio = view.querySelector(
    "#cbi-wireless-wifi-device > :is(table, .table), #cbi-wireless-wifi-device > .md3e-data-scroll > :is(table, .table)",
  );
  if (radio) {
    radio.closest(".cbi-section")?.classList.add("md3e-tonal-data");
    styleNativeTable(
      radio,
      radio.closest(".cbi-section")?.querySelector("h3")?.textContent.trim() ||
        _("Wireless Overview"),
    );
    delete radio.parentElement.dataset.layout;
    radio.classList.add("md3e-wireless-device-table");

    for (const row of nativeTableDataRows(radio)) {
      row.classList.add("md3e-wireless-device-row");
      const hasIfaceAction = Boolean(
        row.querySelector(".cbi-button-edit, .cbi-button-remove"),
      );
      const hasRadioAction = Boolean(
        row.querySelector(".cbi-button-add") ||
          Array.from(row.querySelectorAll("button, .btn")).some((btn) =>
            /^(scan|add)$/i.test(btn.textContent.trim()),
          ),
      );
      const isIfaceRow =
        hasIfaceAction ||
        (!hasRadioAction && Boolean(row.querySelector(".ifacebadge")));
      row.classList.toggle("md3e-wireless-radio-row", !isIfaceRow);
      row.classList.toggle("md3e-wireless-iface-row", isIfaceRow);
      const cells = getRowCells(row);
      cells.forEach((cell, index) => {
        const isActionCell =
          cell.classList.contains("cbi-section-actions") ||
          (index === cells.length - 1 &&
            Boolean(cell.querySelector(".cbi-button, .btn, button")));
        if (isActionCell) {
          cell.classList.add("md3e-wireless-actions-cell");
        } else if (index === 0) {
          cell.classList.add("md3e-wireless-badge-cell");
        } else {
          cell.classList.add("md3e-wireless-info-cell");
          structureWirelessInfoCell(cell);
        }
      });
    }
  }
}

function styleLegacyIptables(view) {
  for (const chain of view.querySelectorAll("[data-table] > [data-chain]")) {
    const table = chain.querySelector(":scope > table.table");
    const title = chain.querySelector(":scope > h4");
    if (!table || !title?.id) continue;

    // LuCI refreshes through chain.lastElementChild and table.parentNode.
    chain.classList.add("md3e-data-scroll");
    chain.setAttribute("role", "region");
    chain.tabIndex = 0;
    chain.setAttribute("aria-labelledby", title.id);
    styleNativeTable(table);
  }
}

function styleFirewallCustom(view) {
  const editor = view.querySelector(":scope > p > textarea");
  if (!editor) return;

  editor.classList.add("md3e-code-editor");
  if (!editor.hasAttribute("aria-label") && !editor.hasAttribute("aria-labelledby"))
    editor.setAttribute("aria-label", view.querySelector(":scope > h2")?.textContent.trim() || _("Custom Rules"));
  const description = editor.parentElement.previousElementSibling;
  if (description?.matches("p") && !editor.hasAttribute("aria-describedby")) {
    if (!description.id) description.id = "md3e-firewall-custom-help";
    editor.setAttribute("aria-describedby", description.id);
  }
}

function styleChannelAnalysis(view) {
  for (const graph of view.querySelectorAll("[data-tab-title] > #channel_graph")) {
    const tab = graph.parentElement;
    const table = tab.querySelector(
      ":scope > table.table, :scope > .md3e-data-scroll > table.table",
    );
    if (!table) continue;
    tab.classList.add("md3e-data-group");
    styleNativeTable(table, tab.dataset.tabTitle || _("Channel Analysis"));
  }
}

function styleRealtime(view) {
  const title = view.querySelector("h2");
  if (title) {
    title.classList.add("md3e-view-copy");
    title.hidden = true;
  }
  const descr = view.querySelector(".cbi-map-descr");
  if (descr) {
    descr.classList.add("md3e-view-copy");
    descr.hidden = true;
  }

  const toolbar = view.querySelector("#settings-row");
  if (toolbar && !toolbar.classList.contains("md3e-realtime-toolbar")) {
    toolbar.classList.add("md3e-realtime-toolbar");
  }

  for (const plot of view.querySelectorAll(".cbi-section > div:has(> svg)")) {
    plot.classList.add("md3e-realtime-plot");
    plot.parentElement.classList.add("md3e-realtime-panel");
  }

  const connTable = view.querySelector("table#connections");
  if (connTable) {
    const group = connTable.closest(".cbi-section-node");
    group?.classList.add("md3e-data-group", "md3e-realtime-connections");
    styleDataTable(connTable, _("Active connections"), "wide");
  }

  const page = document.body.dataset.page || "";
  const isLoad = page === "admin-status-realtime-load";
  const isBw = page === "admin-status-realtime-bandwidth";
  const isConn = page === "admin-status-realtime-connections";
  const isWireless = page === "admin-status-realtime-wireless";

  const firstColTitle = isLoad
    ? _("Interval")
    : isBw
      ? _("Direction")
      : isConn
        ? _("Protocol")
        : _("Metric");

  for (const table of view.querySelectorAll(".cbi-section > table.table:not(#connections)")) {
    if (table.classList.contains("md3e-stats-matrix")) continue;

    const rows = Array.from(table.rows);
    if (!rows.length || !rows.every((r) => r.cells.length === 6)) continue;

    table.classList.add("md3e-stats-matrix");

    const thead = E("thead", {}, [
      E("tr", { class: "tr table-titles" }, [
        E("th", { class: "th md3e-stats-header-label", scope: "col" }, [firstColTitle]),
        E("th", { class: "th md3e-stats-header-val", scope: "col" }, [_("Current")]),
        E("th", { class: "th md3e-stats-header-val", scope: "col" }, [_("Average")]),
        E("th", { class: "th md3e-stats-header-val", scope: "col" }, [_("Peak")]),
      ]),
    ]);

    rows.forEach((row, rowIndex) => {
      const labelCell = row.cells[0];
      const curCell = row.cells[1];
      const avgLabelCell = row.cells[2];
      const avgCell = row.cells[3];
      const peakLabelCell = row.cells[4];
      const peakCell = row.cells[5];

      labelCell.classList.add("md3e-stats-cell-label");
      const strong = labelCell.querySelector("strong");
      if (strong) {
        let lineKey = "";
        if (isLoad) {
          lineKey = rowIndex === 0 ? "load01" : rowIndex === 1 ? "load05" : "load15";
        } else if (isBw) {
          lineKey = rowIndex === 0 ? "rx" : "tx";
        } else if (isConn) {
          lineKey = rowIndex === 0 ? "udp" : rowIndex === 1 ? "tcp" : "other";
        } else if (isWireless) {
          lineKey = curCell.id.match(/^(rssi|noise|rate)_bw_cur$/)?.[1] || "";
        }

        const rawText = strong.textContent.trim().replace(/:\s*$/, "");
        strong.remove();

        let cleanText = rawText;
        if (isLoad) {
          if (/^1\s*Minute(\s*Load)?$/i.test(rawText)) cleanText = _("1 Minute");
          else if (/^5\s*Minute(s)?(\s*Load)?$/i.test(rawText)) cleanText = _("5 Minutes");
          else if (/^15\s*Minute(s)?(\s*Load)?$/i.test(rawText)) cleanText = _("15 Minutes");
          else cleanText = rawText.replace(/\s*Load$/i, "");
        }

        const marker = E("span", {
          class: `md3e-stats-legend-marker md3e-marker-${lineKey}`,
        });
        const labelText = E("span", { class: "md3e-stats-label-text" }, [cleanText]);
        labelCell.append(marker, labelText);
      }

      curCell.classList.add("md3e-stats-cell-val", "md3e-stats-cur");
      curCell.setAttribute("data-label", _("Current"));

      avgCell.classList.add("md3e-stats-cell-val", "md3e-stats-avg");
      avgCell.setAttribute("data-label", _("Average"));

      peakCell.classList.add("md3e-stats-cell-val", "md3e-stats-peak");
      peakCell.setAttribute("data-label", _("Peak"));

      avgLabelCell.remove();
      peakLabelCell.remove();
    });

    table.prepend(thead);
  }
}

// Network → Diagnostics renders bare inputs in a native table cell, each
// followed by a span.diag-action holding the command button. The upstream
// handlers read `ev.currentTarget.parentNode.previousSibling.value`, so the
// label goes before the input and never between it and the action span.
const diagnosticsTargets = new Map([
  ["ping", _("Ping target")],
  ["traceroute", _("Traceroute target")],
  ["nslookup", _("DNS lookup target")],
  ["arp-scan", _("ARP device")],
  ["command-output", _("Command output")],
]);
const diagnosticsButtonCommands = new Map([
  [_("Ping"), "ping"],
  [_("Traceroute"), "traceroute"],
  [_("Nslookup"), "nslookup"],
  [_("Arp-scan"), "arp-scan"],
]);

// The command is read from the group itself: the first combo choice names it,
// otherwise the direct action button does. Unknown groups stay untouched.
function diagnosticsCommand(action) {
  const choice = action.querySelector("li[data-value]");
  if (choice)
    return diagnosticsTargets.has(choice.dataset.value)
      ? choice.dataset.value
      : "";
  const button = action.querySelector(":scope > .cbi-button");
  return diagnosticsButtonCommands.get(button?.textContent.trim()) || "";
}

function labelDiagnosticsField(field, command) {
  if (
    field.labels?.length ||
    field.getAttribute("aria-label")?.trim() ||
    field.getAttribute("aria-labelledby")?.trim()
  )
    return;
  if (!field.id) {
    const base = `md3e-diag-${command}`;
    let id = base;
    for (let index = 2; document.getElementById(id); index++)
      id = `${base}-${index}`;
    field.id = id;
  }
  field.before(
    E("label", { class: "md3e-diag-label", for: field.id }, [
      diagnosticsTargets.get(command),
    ]),
  );
}

function styleDiagnostics(view) {
  const map = view.querySelector(".cbi-map");
  if (!map) return;

  for (const action of map.querySelectorAll("span.diag-action")) {
    const field = action.previousElementSibling;
    if (!field?.matches("input[type=text], select")) continue;
    const command = diagnosticsCommand(action);
    if (command) labelDiagnosticsField(field, command);
  }

  const output = map.querySelector("#command-output > textarea");
  if (output) {
    output.closest(".cbi-section")?.classList.add("md3e-tonal-data");
    labelDiagnosticsField(output, "command-output");
  }
}

return baseclass.extend({
  __init__() {
    const view = document.getElementById("view");
    if (!view) return;
    const page = document.body.dataset.page;
    if (["admin-status-routes", "admin-status-routesj"].includes(page)) {
      const refresh = () => styleRoutingTables(view);
      view.addEventListener("keydown", handleRoutingKeys);
      refresh();
      theme.observeDomMutations(view, "management-page", refresh, {
        childList: true,
        attributes: true,
        attributeFilter: ["data-tab-active", "data-sort-direction"],
        subtree: true,
      });
      return;
    }
    const interfaces = page === "admin-network-network";
    const firewall = /^admin-network-firewall(?:-|$)/.test(page);
    if (interfaces || firewall) {
      this.actions = interfaces ? interfaceActions : firewallActions;
      if (HTMLElement.prototype.showPopover && L.hasViewPermission() !== false)
        this.buildMenu();
    }
    if (editorMapId(page)) this.styleNativeEditor();

    const refresh = () => {
      const page = document.body.dataset.page || "";
      markTonalNativeSettings(view, page);
      if (this.current && !this.current.trigger.isConnected)
        this.menu?.hidePopover();
      if (this.currentStartup && !this.currentStartup.trigger.isConnected)
        this.startupMenu?.hidePopover();
      const interfaces = page === "admin-network-network";
      const firewall = /^admin-network-firewall(?:-|$)/.test(page);
      if (interfaces || firewall) {
        this.actions = interfaces ? interfaceActions : firewallActions;
        if (!this.menu && HTMLElement.prototype.showPopover && L.hasViewPermission() !== false)
          this.buildMenu();
        if (interfaces) styleNetworkTables(view);
        const root = view.querySelector(
          interfaces ? "#cbi-network-interface" : "#cbi-firewall",
        );
        root
          ?.querySelectorAll(".cbi-section-table-row[data-sid]")
          .forEach((row) => {
            if (interfaces) this.updateSummary(row);
            if (this.menu) this.addMenuTrigger(row);
          });
        if (page === "admin-network-firewall-custom") styleFirewallCustom(view);
        else if (firewall) {
          if (page === "admin-network-firewall-zones") {
            view.querySelectorAll("#cbi-firewall > .cbi-section:has(> .cbi-section-node > .cbi-value)")
              .forEach((section) => section.classList.add("md3e-tonal-settings"));
          }
          styleFirewallGrids(view);
        }
      } else if (page === "admin-network-dhcp") {
        styleDhcpLeases(view);
        styleTonalSettingsTabs(view, ":is(#cbi-dhcp-dnsmasq, #cbi-dhcp-odhcpd) > .cbi-section-node-tabbed", true);
        styleDhcpServiceTables(view);
      } else if (page === "admin-network-dns") {
        styleDnsRecords(view);
        styleTonalSettingsTabs(view, "#cbi-dhcp-dnsmasq > .cbi-section-node-tabbed");
      } else if (page === "admin-network-routes") {
        styleStaticRoutes(view);
      } else if (page === "admin-network-switch") {
        view.querySelector("#cbi-network-switch_vlan")?.classList.add("md3e-tonal-data");
        for (const section of view.querySelectorAll("#cbi-network > .cbi-section:not(#cbi-network-switch_vlan)"))
          if (section.querySelector(":scope > .cbi-section-node > .cbi-value > .cbi-value-field"))
            section.classList.add("md3e-tonal-settings");
        styleCbiDataTables(view, "#cbi-network-switch_vlan", _("Switch"));
      } else if (page === "admin-network-wireless") {
        styleWireless(view);
      } else if (page === "admin-network-diagnostics") {
        styleDiagnostics(view);
      } else if (page === "admin-system-mounts") {
        styleMounts(view);
      } else if (page === "admin-system-leds") {
        view.querySelector("#cbi-system-led")?.classList.add("md3e-tonal-data");
        styleCbiDataTables(view, "#cbi-system-led", _("LED Configuration"));
      } else if (page === "admin-system-system") {
        this.styleSystem(view);
      } else if (page === "admin-system-startup") {
        this.styleStartup(view);
      } else if ((page && page.startsWith("admin-system-admin")) || view.querySelector("input.cbi-input-password, input[type='password']")) {
        this.stylePassword(view);
        if (page === "admin-system-admin-repokeys") {
          this.styleRepoKeys(view);
        } else if (page === "admin-system-admin-sshkeys") {
          view.querySelector("#view > div > .cbi-section-node:has(> .cbi-dynlist)")
            ?.classList.add("md3e-tonal-data", "md3e-ssh-key-list");
        }
      } else if (page === "admin-system-reboot") {
        this.styleReboot(view);
      } else if (page === "admin-system-crontab") {
        this.styleCrontab(view);
      } else if (page === "admin-system-flash") {
        this.styleFlash(view);
      } else if (page === "admin-system-package-manager") {
        this.styleSoftware(view);
      } else if (["admin-status-iptables", "admin-status-nftables-iptables"].includes(page)) {
        styleLegacyIptables(view);
      } else if (page === "admin-status-nftables") {
        styleNftables(view);
      } else if (page === "admin-status-channel_analysis") {
        styleChannelAnalysis(view);
      } else if (page && page.startsWith("admin-status-realtime-")) {
        styleRealtime(view);
      } else if (page === "admin-status-logs-dmesg") {
        this.styleDmesg(view.querySelector("#content_syslog"));
      } else {
        this.styleLog(view.querySelector("#content_syslog"));
      }
      if (this.current) this.updateMenu();
      if (this.currentStartup) this.updateStartupMenu();
    };
    refresh();
    theme.observeDomMutations(view, "management-page", refresh, {
      childList: true,
      attributes: true,
      attributeFilter: [
        "disabled",
        "reconnect",
        "disconnect",
        "data-tab-active",
        "data-offset",
        "title",
      ],
      subtree: true,
    });
  },

  styleSystem(view) {
    styleTonalSettingsTabs(view, "#cbi-system .cbi-section-node-tabbed");

    const clock = view.querySelector(
      '#cbi-system [data-name="_systime"] button',
    );
    clock?.parentElement.classList.add("md3e-clock-actions");
  },

  styleLog(content) {
    if (!content) return;
    content.classList.add("md3e-log-panel");
    const title = content.parentElement?.querySelector(":scope > h2");
    if (title) {
      title.classList.add("md3e-view-copy");
      title.hidden = true;
    }
    const descr = content.querySelector(".cbi-section-descr");
    if (descr && !descr.textContent.trim()) {
      descr.remove();
    }
    if (content.dataset.md3eLogFilters) return;
    const specs = [
      [
        "logFacilitySelect",
        "invertLogFacilitySearch",
        _("Invert facility filter"),
      ],
      [
        "logSeveritySelect",
        "invertLogSeveritySearch",
        _("Invert severity filter"),
      ],
      ["logTextFilter", "invertLogTextSearch", _("Invert text filter")],
      ["logMaxRows"],
    ];
    const controls = specs.map(([id, invertId, invertName]) => ({
      input: content.querySelector("#" + id),
      label: content.querySelector("label[for=\"" + id + "\"]"),
      invert: invertId && content.querySelector("#" + invertId),
      invertLabel:
        invertId && content.querySelector("label[for=\"" + invertId + "\"]"),
      invertName,
    }));
    if (controls.some(({ input, label }) => !input || !label)) return;
    content.dataset.md3eLogFilters = "true";

    const fields = [];
    const rowsToClean = new Set();
    for (const { input, label, invert, invertLabel, invertName } of controls) {
      rowsToClean.add(label.parentElement);
      if (input && !input.placeholder && input.id === "logMaxRows") {
        input.placeholder = "1000";
      }
      const labelRow = E("div", { class: "md3e-log-label-row" }, [label]);
      if (invert) {
        invert.setAttribute("aria-label", invertName);
        const invertText = invertLabel?.textContent.trim() || _("Not");
        const invertWrap = E("label", { class: "md3e-log-invert", for: invert.id }, [
          invert,
          E("span", { class: "md3e-log-invert-text" }, [invertText]),
        ]);
        labelRow.append(invertWrap);
      }
      const field = E("div", { class: "md3e-log-field" }, [labelRow, input]);
      fields.push(field);
    }

    const toolbar = E("div", { class: "md3e-log-toolbar" }, fields);
    const firstRow = Array.from(rowsToClean)[0];
    if (firstRow) {
      firstRow.before(toolbar);
      rowsToClean.forEach((r) => r.remove());
    }

    content
      .querySelector("#scrollDownButton")
      ?.parentElement.classList.add("md3e-log-jump");
    content
      .querySelector("#scrollUpButton")
      ?.parentElement.classList.add("md3e-log-jump");
  },

  styleDmesg(content) {
    if (!content) return;
    content.classList.add("md3e-log-panel");
    const title = content.parentElement?.querySelector(":scope > h2");
    if (title) {
      title.classList.add("md3e-view-copy");
      title.hidden = true;
    }
    if (content.dataset.md3eLogFilters) return;
    const timeRow = content.querySelector("#logFromTime")?.parentElement;
    const sevRow = content.querySelector("#logSeveritySelect")?.parentElement;
    const sortRow = content.querySelector("#invertAscendingSort")?.parentElement;
    const textRow = content.querySelector("#logTextFilter")?.parentElement;

    if (!timeRow || !sevRow || !sortRow || !textRow) return;
    content.dataset.md3eLogFilters = "true";

    const invertRange = timeRow.querySelector("#invertLogRangeTime");
    const fromInput = timeRow.querySelector("#logFromTime");
    const toInput = timeRow.querySelector("#logToTime");
    toInput?.setAttribute("aria-label", _("To"));
    fromInput?.setAttribute("aria-label", _("From"));

    const getFilterLabel = (row, invertId, fallback) => {
      const label = Array.from(row.querySelectorAll("label")).find((el) => {
        if (el.getAttribute("for") === invertId) return false;
        if (el.querySelector(`#${invertId}`)) return false;
        const txt = el.textContent.trim();
        return txt && txt !== _("Not") && txt !== "Not";
      });
      return label?.textContent.trim() || fallback;
    };

    const nativeTimeLabel = getFilterLabel(timeRow, "invertLogRangeTime", _("Time range (seconds):"));
    const timeLabelRow = E("div", { class: "md3e-log-label-row" }, [
      E("label", { for: "logFromTime" }, [nativeTimeLabel]),
    ]);
    if (invertRange) {
      invertRange.setAttribute("aria-label", _("Invert time range"));
      timeLabelRow.append(
        E("label", { class: "md3e-log-invert", for: "invertLogRangeTime" }, [
          invertRange,
          E("span", { class: "md3e-log-invert-text" }, [_("Not")]),
        ]),
      );
    }
    const timeInputs = E("div", { class: "md3e-log-range-inputs" }, [
      fromInput,
      E("span", { class: "md3e-log-range-sep" }, [_("to")]),
      toInput,
    ]);
    const timeField = E("div", { class: "md3e-log-field md3e-log-field-range" }, [
      timeLabelRow,
      timeInputs,
    ]);

    const invertSev = sevRow.querySelector("#invertSeverity");
    const sevSelect = sevRow.querySelector("#logSeveritySelect");
    const nativeSevLabel = getFilterLabel(sevRow, "invertSeverity", _("Severity:"));
    const sevLabelRow = E("div", { class: "md3e-log-label-row" }, [
      E("label", { for: "logSeveritySelect" }, [nativeSevLabel]),
    ]);
    if (invertSev) {
      invertSev.setAttribute("aria-label", _("Invert severity filter"));
      sevLabelRow.append(
        E("label", { class: "md3e-log-invert", for: "invertSeverity" }, [
          invertSev,
          E("span", { class: "md3e-log-invert-text" }, [_("Not")]),
        ]),
      );
    }
    const sevField = E("div", { class: "md3e-log-field" }, [
      sevLabelRow,
      sevSelect,
    ]);

    const invertText = textRow.querySelector("#invertLogTextSearch");
    const textInput = textRow.querySelector("#logTextFilter");
    const nativeTextLabel = getFilterLabel(textRow, "invertLogTextSearch", _("Search text:"));
    const textLabelRow = E("div", { class: "md3e-log-label-row" }, [
      E("label", { for: "logTextFilter" }, [nativeTextLabel]),
    ]);
    if (invertText) {
      invertText.setAttribute("aria-label", _("Invert text filter"));
      textLabelRow.append(
        E("label", { class: "md3e-log-invert", for: "invertLogTextSearch" }, [
          invertText,
          E("span", { class: "md3e-log-invert-text" }, [_("Not")]),
        ]),
      );
    }
    const textField = E("div", { class: "md3e-log-field" }, [
      textLabelRow,
      textInput,
    ]);

    const invertSort = sortRow.querySelector("#invertAscendingSort");
    const nativeSortLabel = sortRow.querySelector("label:not([for='invertAscendingSort'])")?.textContent.trim() || _("Order:");
    const nativeSortText = sortRow.querySelector("label[for='invertAscendingSort']")?.textContent.trim() || _("Reverse sort");
    const sortLabelRow = E("div", { class: "md3e-log-label-row" }, [
      E("label", { for: "invertAscendingSort" }, [nativeSortLabel]),
    ]);
    const sortToggleWrap = E("label", { class: "md3e-log-toggle-field", for: "invertAscendingSort" }, [
      invertSort,
      E("span", {}, [nativeSortText]),
    ]);
    const sortField = E("div", { class: "md3e-log-field md3e-log-field-toggle" }, [
      sortLabelRow,
      sortToggleWrap,
    ]);

    const filterGrid = E("div", { class: "md3e-log-toolbar md3e-log-toolbar-dmesg" }, [
      timeField,
      sevField,
      textField,
      sortField,
    ]);

    timeRow.replaceWith(filterGrid);
    sevRow.remove();
    sortRow.remove();
    textRow.remove();

    content
      .querySelector("#scrollDownButton")
      ?.parentElement.classList.add("md3e-log-jump");
    content
      .querySelector("#scrollUpButton")
      ?.parentElement.classList.add("md3e-log-jump");
  },

  updateSummary(row) {
    const heading = row.querySelector(".ifacebox-head");
    const status = row.querySelector(statusSelector);
    if (!heading || !status) return;

    row.classList.add("md3e-interface-row");
    heading
      .closest('[data-name="_ifacebox"]')
      ?.classList.add("md3e-interface-cell");
    status.parentElement?.classList.add("md3e-interface-status-cell");
    row
      .querySelector(".cbi-section-actions")
      ?.classList.add("md3e-interface-actions-cell");

    let summary = heading.querySelector(".md3e-iface-summary");
    if (!summary) {
      summary = E("div", { class: "md3e-iface-summary" }, [
        E("span", { class: "md3e-iface-badge" }),
        E("span", { class: "md3e-iface-addresses" }),
      ]);
      heading.append(summary);
    }

    const values = new Map();
    for (const line of status.querySelectorAll(":scope > .nowrap")) {
      const label = line.firstElementChild;
      if (!label?.matches("strong, b")) continue;
      const key = label.textContent.trim().replace(/:$/, "");
      const value = line.textContent.slice(label.textContent.length).trim();
      if (!values.has(key)) values.set(key, []);
      values.get(key).push(value);
      if (key === _("IPv4") || key === _("IPv6")) {
        line.classList.add("md3e-iface-duplicate-address");
      }
    }

    let state = _("Status unavailable");
    let active = false;
    if (status.hasAttribute("reconnect")) state = _("Starting…");
    else if (status.hasAttribute("disconnect")) state = _("Stopping…");
    else if (values.get(_("Information"))?.includes(_("Interface disabled")))
      state = _("Disabled");
    else if (values.has(_("Protocol"))) {
      if (status.querySelector("a")) state = _("Pending changes");
      else {
        active = values.has(_("Uptime"));
        state = active ? _("Up") : _("Down");
      }
    }

    const addresses = [
      ...(values.get(_("IPv4")) || []),
      ...(values.get(_("IPv6")) || []),
    ].join(" · ");
    const [badge, ip] = summary.children;
    if (badge.textContent !== state) badge.textContent = state;
    badge.classList.toggle("is-up", active);
    if (ip.textContent !== addresses) ip.textContent = addresses;
  },

  addMenuTrigger(row) {
    const cluster = row.querySelector(
      ".cbi-section-actions .cbi-button-edit",
    )?.parentElement;
    if (!cluster || cluster.querySelector(".md3e-row-menu-trigger")) return;

    const actions = this.actions.map(({ selector }) =>
      cluster.querySelector(selector),
    );
    if (actions.some((action) => !action)) return;
    const name =
      row.querySelector(".cbi-section-table-titles")?.textContent.trim() ||
      row.dataset.sid;
    const trigger = E(
      "button",
      {
        type: "button",
        class: "md3e-row-menu-trigger",
        "aria-label": _("Actions for %s").format(name),
        "aria-controls": this.menu.id,
        "aria-expanded": "false",
        click: () => this.openMenu({ trigger, actions, name }),
      },
      [E("span", { "aria-hidden": "true" }, ["⋯"])],
    );
    cluster.append(trigger);
    for (const action of actions)
      action.classList.add("md3e-native-row-action");
  },

  buildMenu() {
    this.buttons = this.actions.map(({ danger }, index) =>
      E("button", {
        type: "button",
        class: danger ? "md3e-row-menu-danger" : "",
        click: () => this.runAction(index),
      }),
    );
    this.menu = E(
      "div",
      {
        id: "md3e-interface-actions",
        class: "md3e-row-menu",
        role: "group",
        popover: "auto",
      },
      this.buttons,
    );
    document.body.append(this.menu);
    this.menu.addEventListener("beforetoggle", (event) => {
      if (event.newState !== "closed") return;
      this.current?.trigger.setAttribute("aria-expanded", "false");
      this.current = null;
    });
    this.menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const trigger = this.current?.trigger;
      this.menu.hidePopover();
      trigger?.focus({ preventScroll: true });
    });
    document.addEventListener("focusin", (event) => {
      if (
        this.current &&
        event.target !== this.current.trigger &&
        !this.menu.contains(event.target)
      ) {
        this.menu.hidePopover();
      }
    });
    window.addEventListener("scroll", () => this.positionMenu(), {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", () => this.positionMenu());
  },

  openMenu(entry) {
    const same = this.current?.trigger === entry.trigger;
    if (this.current) this.menu.hidePopover();
    if (same) return;
    this.current = entry;
    this.updateMenu();
    this.menu.setAttribute(
      "aria-label",
      entry.trigger.getAttribute("aria-label"),
    );
    this.menu.showPopover({ source: entry.trigger });
    entry.trigger.setAttribute("aria-expanded", "true");
    this.positionMenu();
    this.buttons
      .find((button) => !button.disabled)
      ?.focus({ preventScroll: true });
  },

  updateMenu() {
    this.current.actions.forEach((source, index) => {
      const button = this.buttons[index];
      if (button.textContent !== source.textContent)
        button.textContent = source.textContent;
      if (button.disabled !== source.disabled)
        button.disabled = source.disabled;
    });
  },

  positionMenu() {
    if (!this.current) return;
    const { top, right, bottom, left: triggerLeft } = this.current.trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = this.menu;
    const gap = 8;
    const preferredLeft = right - width >= gap ? right - width : triggerLeft;
    const left = Math.max(
      gap,
      Math.min(preferredLeft, innerWidth - width - gap),
    );
    const y =
      bottom + height + gap <= innerHeight
        ? bottom + gap
        : Math.max(gap, top - height - gap);
    Object.assign(this.menu.style, {
      left: left + "px",
      top: y + "px",
      right: "auto",
      bottom: "auto",
    });
  },

  runAction(index) {
    const entry = this.current;
    if (!entry) return;
    const source = entry.actions[index];
    if (source.disabled || !source.isConnected) return;
    this.menu.hidePopover();
    entry.trigger.focus({ preventScroll: true });
    const execute = () => {
      if (source.isConnected && !source.disabled) source.click();
    };

    const action = this.actions[index];
    if (!action.title) {
      execute();
      return;
    }
    const cancel = E(
      "button",
      { class: "btn", type: "button", click: () => ui.hideModal() },
      [_("Cancel")],
    );
    ui.showModal(
      action.title.format(entry.name),
      [
        E("p", {}, [action.message]),
        E("div", { class: "button-row" }, [
          cancel,
          E(
            "button",
            {
              type: "button",
              class: !action.danger
                ? "btn cbi-button-action important"
                : "btn cbi-button-negative important",
              click: () => {
                ui.hideModal();
                execute();
              },
            },
            [source.textContent],
          ),
        ]),
      ],
      "md3e-danger-confirm",
    );
    cancel.focus({ preventScroll: true });
  },

  // Apply the page's settings surface only to its own native CBI editor.
  // Other dialogs on the same route retain their existing layout.
  styleNativeEditor() {
    if (this.nativeEditorHook) return;
    this.nativeEditorHook = true;
    const show = ui.showModal;
    ui.showModal = function (...args) {
      const dialog = show.apply(this, args);
      dialog.classList.remove("md3e-native-editor", "md3e-interface-editor");
      if (
        dialog.getAttribute("aria-labelledby") === "md3e-interface-editor-title"
      ) {
        dialog.removeAttribute("aria-labelledby");
      }

      const page = document.body.dataset.page || "";
      const map = dialog.querySelector(":scope > .cbi-map");
      if (!map || map.id !== editorMapId(page)) return dialog;

      dialog.classList.add("md3e-native-editor");
      styleTonalSettingsTabs(dialog, ".cbi-map .cbi-section-node-tabbed", true);
      if (!map.querySelector(".cbi-section-node-tabbed")) {
        for (const node of map.querySelectorAll(
          ":scope > .cbi-section > .cbi-section-node",
        )) {
          if (node.querySelector(":scope > .cbi-value > .cbi-value-field"))
            node.classList.add("md3e-tonal-settings");
        }
      }

      const status = dialog.querySelector(
        '[data-name="_ifacestat_modal"] [id$="-ifc-status"]',
      );
      const title = dialog.querySelector(":scope > h4");
      if (!status || !title) return dialog;

      dialog.classList.add("md3e-interface-editor");
      title.id = "md3e-interface-editor-title";
      title.textContent = _("Edit interface %s").format(
        status.id.slice(0, -"-ifc-status".length),
      );
      dialog.setAttribute("aria-labelledby", title.id);
      return dialog;
    };
  },

  buildStartupMenu() {
    this.startupMenuActions = [
      { text: _("Start"), action: "start" },
      { text: _("Restart"), action: "restart" },
      { text: _("Reload"), action: "reload" },
      { text: _("Stop"), danger: true, action: "stop" },
    ];
    this.startupButtons = this.startupMenuActions.map(({ text, danger }, index) =>
      E("button", {
        type: "button",
        class: danger ? "md3e-row-menu-danger" : "",
        click: () => this.runStartupAction(index),
      }, [text])
    );
    this.startupMenu = E(
      "div",
      {
        id: "md3e-startup-actions",
        class: "md3e-row-menu",
        role: "group",
        popover: "auto",
      },
      this.startupButtons,
    );
    document.body.append(this.startupMenu);

    this.startupMenu.addEventListener("beforetoggle", (event) => {
      if (event.newState !== "closed") return;
      this.currentStartup?.trigger.setAttribute("aria-expanded", "false");
      this.currentStartup = null;
    });
    this.startupMenu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const trigger = this.currentStartup?.trigger;
      this.startupMenu.hidePopover();
      trigger?.focus({ preventScroll: true });
    });
    document.addEventListener("focusin", (event) => {
      if (
        this.currentStartup &&
        event.target !== this.currentStartup.trigger &&
        !this.startupMenu.contains(event.target)
      ) {
        this.startupMenu.hidePopover();
      }
    });
    window.addEventListener("scroll", () => this.positionStartupMenu(), {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", () => this.positionStartupMenu());
  },

  positionStartupMenu() {
    if (!this.currentStartup) return;
    const { top, right, bottom, left: triggerLeft } = this.currentStartup.trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = this.startupMenu;
    const gap = 8;
    const preferredLeft = right - width >= gap ? right - width : triggerLeft;
    const left = Math.max(
      gap,
      Math.min(preferredLeft, innerWidth - width - gap),
    );
    const y =
      bottom + height + gap <= innerHeight
        ? bottom + gap
        : Math.max(gap, top - height - gap);
    Object.assign(this.startupMenu.style, {
      left: left + "px",
      top: y + "px",
      right: "auto",
      bottom: "auto",
    });
  },

  openStartupMenu(entry) {
    const same = this.currentStartup?.trigger === entry.trigger;
    if (this.currentStartup) this.startupMenu.hidePopover();
    if (same) return;
    this.currentStartup = entry;
    this.updateStartupMenu();
    this.startupMenu.setAttribute("aria-label", entry.trigger.getAttribute("aria-label"));
    this.startupMenu.showPopover({ source: entry.trigger });
    entry.trigger.setAttribute("aria-expanded", "true");
    this.positionStartupMenu();
    this.startupButtons.find(b => !b.disabled)?.focus({ preventScroll: true });
  },

  updateStartupMenu() {
    if (!this.currentStartup) return;
    const { actionMap } = this.currentStartup;
    this.startupMenuActions.forEach((item, index) => {
      const btn = this.startupButtons[index];
      const source = actionMap[item.action];
      if (source) {
        btn.style.display = "";
        btn.disabled = source.disabled;
        if (source.textContent) btn.textContent = source.textContent;
      } else {
        btn.style.display = "none";
      }
    });
  },

  runStartupAction(index) {
    const entry = this.currentStartup;
    if (!entry) return;
    const item = this.startupMenuActions[index];
    const source = entry.actionMap[item.action];
    if (!source || source.disabled || !source.isConnected) return;
    this.startupMenu.hidePopover();
    entry.trigger.focus({ preventScroll: true });

    if (item.danger) {
      const cancel = E("button", { class: "btn", type: "button", click: () => ui.hideModal() }, [_("Cancel")]);
      ui.showModal(
        _("Stop service %s?").format(entry.name),
        [
          E("p", {}, [_("Stopping this service may disrupt network connectivity or background functions.")]),
          E("div", { class: "button-row" }, [
            cancel,
            E("button", {
              type: "button",
              class: "btn cbi-button-negative important",
              click: () => {
                ui.hideModal();
                if (source.isConnected && !source.disabled) source.click();
              }
            }, [source.textContent || _("Stop")])
          ])
        ],
        "md3e-danger-confirm"
      );
      cancel.focus({ preventScroll: true });
    } else {
      source.click();
    }
  },

  styleStartup(view) {
    const rcTab = view.querySelector(".cbi-section[data-tab='rc']");
    const rcTextarea = rcTab?.querySelector("textarea");
    if (rcTextarea) rcTab.classList.add("md3e-tonal-data");
    if (rcTextarea && !rcTextarea.classList.contains("md3e-code-editor")) {
      rcTextarea.classList.add("md3e-code-editor");
      rcTextarea.spellcheck = false;
      rcTextarea.setAttribute("wrap", "off");
    }

    if (!this.startupMenu && HTMLElement.prototype.showPopover && L.hasViewPermission() !== false) {
      this.buildStartupMenu();
    }

    const initTab = view.querySelector("div[data-tab='init']");
    if (!initTab) return;
    const table = initTab.querySelector("table");
    if (table) {
      initTab.classList.add("md3e-tonal-data");
      table.classList.add("md3e-startup-table");
      styleNativeTable(table, _("Initscripts"));
    }

    const rows = initTab.querySelectorAll("table tr.md3e-table-data-title-row, table tr:not(.table-titles)");
    rows.forEach(row => {
      const actionsCell = row.querySelector(".cbi-section-actions, .md3e-row-actions");
      if (!actionsCell) return;

      const cluster = actionsCell.querySelector(".md3e-row-action-cluster") || actionsCell;
      const allButtons = Array.from(cluster.querySelectorAll("button:not(.md3e-row-menu-trigger)"));
      if (allButtons.length < 2) return;

      const nameCell = row.querySelector("[data-title='Initscript'], td:nth-child(2)");
      const name = nameCell?.textContent.trim() || row.dataset.sid || "service";

      const actionMap = {};
      const matchLabel = (txt, keys) => keys.some((k) => k && txt === k.toLowerCase());
      const startKeys = [_("Start"), "Start"];
      const restartKeys = [_("Restart"), "Restart"];
      const reloadKeys = [_("Reload"), "Reload"];
      const stopKeys = [_("Stop"), "Stop"];
      const enableKeys = [_("Enabled"), _("Disabled"), "Enabled", "Disabled"];
      const rowActionBtns = [];

      allButtons.forEach(btn => {
        const txt = btn.textContent.trim().toLowerCase();
        if (matchLabel(txt, enableKeys) || btn.classList.contains("cbi-button-positive") || btn.classList.contains("cbi-button-neutral")) {
          btn.classList.remove("md3e-native-row-action");
        } else {
          btn.classList.add("md3e-native-row-action");
          rowActionBtns.push(btn);
          if (matchLabel(txt, startKeys)) actionMap.start = btn;
          else if (matchLabel(txt, restartKeys)) actionMap.restart = btn;
          else if (matchLabel(txt, reloadKeys)) actionMap.reload = btn;
          else if (matchLabel(txt, stopKeys)) actionMap.stop = btn;
        }
      });

      if (!actionMap.start && !actionMap.restart && !actionMap.reload && !actionMap.stop && rowActionBtns.length === 4) {
        [actionMap.start, actionMap.restart, actionMap.reload, actionMap.stop] = rowActionBtns;
      }

      let trigger = cluster.querySelector(".md3e-row-menu-trigger");
      if (!trigger && this.startupMenu) {
        trigger = E("button", {
          type: "button",
          class: "md3e-row-menu-trigger",
          "aria-label": _("Actions for %s").format(name),
          "aria-controls": this.startupMenu.id,
          "aria-expanded": "false",
          click: () => this.openStartupMenu(trigger._md3eStartupEntry),
        }, [E("span", { "aria-hidden": "true" }, ["⋮"])]);
        trigger._md3eStartupEntry = { trigger, name, actionMap, row };
        cluster.append(trigger);
      } else if (trigger) {
        trigger._md3eStartupEntry = { trigger, name, actionMap, row };
        if (this.currentStartup?.trigger === trigger) {
          this.currentStartup.actionMap = actionMap;
          this.updateStartupMenu();
        }
      }
    });
  },

  stylePassword(view) {
    const pwInputs = view.querySelectorAll('input.cbi-input-password, input[type="password"], input[name$="pw1"], input[name$="pw2"], input[id$="password.pw1"], input[id$="password.pw2"]');
    pwInputs.forEach(input => {
      const group = input.closest(".control-group") || input.parentElement;
      const revealLabel = _("Reveal/hide password");
      const nativeToggle = Array.from(group?.querySelectorAll("button") || []).find((b) => {
        if (b.classList.contains("md3e-password-toggle")) return false;
        const t = (b.getAttribute("title") || "") + " " + (b.getAttribute("aria-label") || "");
        return t.includes("Reveal/hide") || (revealLabel && t.includes(revealLabel));
      });
      if (nativeToggle) nativeToggle.style.display = "none";

      if (input.closest(".md3e-password-wrap")) return;

      input.type = "password";
      input.setAttribute("type", "password");

      const wrap = E("div", { class: "md3e-password-wrap" });
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      const eyeSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
      const eyeOffSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';

      const toggle = E("button", {
        type: "button",
        class: "md3e-password-toggle",
        "aria-label": _("Show password"),
        title: _("Show password"),
        click: (e) => {
          e.preventDefault();
          const isPass = input.type === "password";
          input.type = isPass ? "text" : "password";
          input.setAttribute("type", input.type);
          toggle.innerHTML = isPass ? eyeOffSvg : eyeSvg;
          const label = isPass ? _("Hide password") : _("Show password");
          toggle.setAttribute("aria-label", label);
          toggle.setAttribute("title", label);
          input.focus({ preventScroll: true });
        }
      });
      toggle.innerHTML = eyeSvg;
      wrap.appendChild(toggle);
    });
  },

  styleReboot(view) {
    const btn = view.querySelector("button.cbi-button-action, button.cbi-button-negative, .cbi-map button");
    if (!btn || btn.__rebootModalHooked) return;
    btn.__rebootModalHooked = true;

    btn.addEventListener("click", (event) => {
      if (btn.__rebootConfirmed) {
        btn.__rebootConfirmed = false;
        return;
      }
      event.stopImmediatePropagation();
      event.preventDefault();

      const cancel = E("button", {
        type: "button",
        class: "btn",
        click: () => ui.hideModal()
      }, [_("Cancel")]);

      const confirm = E("button", {
        type: "button",
        class: "btn cbi-button-negative important",
        click: () => {
          ui.hideModal();
          btn.__rebootConfirmed = true;
          btn.click();
        }
      }, [_("Reboot")]);

      ui.showModal(
        _("Reboot device?"),
        [
          E("p", {}, [_("Rebooting will disconnect all active sessions and interrupt network traffic. Do you want to continue?")]),
          E("div", { class: "button-row" }, [cancel, confirm])
        ],
        "md3e-danger-confirm"
      );
      cancel.focus({ preventScroll: true });
    }, true);
  },

  styleCrontab(view) {
    const ta = view.querySelector("textarea");
    if (!ta) return;
    view.classList.add("md3e-code-group", "md3e-tonal-data");
    const heading = view.querySelector(":scope > h2");
    if (heading && !ta.labels?.length &&
        !ta.hasAttribute("aria-labelledby") && !ta.hasAttribute("aria-label")) {
      heading.id ||= "md3e-crontab-title";
      ta.setAttribute("aria-labelledby", heading.id);
    }
    if (!ta.classList.contains("md3e-code-editor")) {
      ta.classList.add("md3e-code-editor");
      ta.spellcheck = false;
      ta.setAttribute("wrap", "off");
    }
  },

  styleFlash(view) {
    for (const section of view.querySelectorAll(
      ".cbi-map-tabbed > .cbi-section > .cbi-section-node > .cbi-value > .cbi-section",
    )) {
      section.classList.add("md3e-tonal-settings");
      section.parentElement.classList.add("md3e-tonal-shell");
      section.parentElement.closest(".cbi-section-node")
        ?.classList.add("md3e-tonal-shell");
    }
    view.querySelector("#cbi-json-config.cbi-section-node")
      ?.closest(".cbi-section")?.classList.add("md3e-tonal-settings");

    view.querySelectorAll("textarea").forEach(ta => {
      if (!ta.classList.contains("md3e-code-editor")) {
        ta.classList.add("md3e-code-editor");
        ta.spellcheck = false;
        ta.setAttribute("wrap", "off");
      }
    });
  },

  styleRepoKeys(view) {
    view.querySelector("#cbi-json-keys")
      ?.classList.add("md3e-tonal-data", "md3e-record-list");
    styleCbiDataTables(view, "#cbi-json-keys", _("Repo Public Keys"));
    view.querySelector("#cbi-json-fup")?.closest(".cbi-section")
      ?.classList.add("md3e-tonal-settings");

    view.querySelectorAll("textarea").forEach(ta => {
      if (!ta.classList.contains("md3e-code-editor")) {
        ta.classList.add("md3e-code-editor");
        ta.spellcheck = false;
        ta.setAttribute("wrap", "off");
      }
    });
  },

  ensureSoftwareStyles() {
    if (document.getElementById("md3e-software-styles")) return;
    const style = document.createElement("style");
    style.id = "md3e-software-styles";
    style.textContent = `
      :root {
        --md-sys-motion-spatial-fast-duration: 417ms;
        --md-sys-motion-spatial-fast-easing: linear(0, 0.02522, 0.09118, 0.18466, 0.29439, 0.41107, 0.52737, 0.63778, 0.73844, 0.8269, 0.9019, 0.96316, 1.01109, 1.04668, 1.07126, 1.08635, 1.09356, 1.09449, 1.09064, 1.08337, 1.07388, 1.06316, 1.05205, 1.04116, 1.03098, 1.02181, 1.01385, 1.00718, 1.00181, 0.99768, 0.99468, 0.99267, 0.99151, 0.99104, 0.99112, 0.99161, 0.99239, 0.99333, 0.99437, 0.99542, 0.99644, 0.99737, 0.9982, 0.99892, 0.99951, 0.99997, 1.00033, 1.00058, 1.00074, 1.00083, 1);
        --md-sys-motion-spatial-medium-duration: 533ms;
        --md-sys-motion-spatial-medium-easing: linear(0, 0.0121, 0.04433, 0.09135, 0.14867, 0.21261, 0.28018, 0.34897, 0.41711, 0.48317, 0.5461, 0.60514, 0.65983, 0.70989, 0.75522, 0.79585, 0.83191, 0.86362, 0.89123, 0.91504, 0.93538, 0.95255, 0.9669, 0.97873, 0.98835, 0.99603, 1.00205, 1.00664, 1.01003, 1.01241, 1.01396, 1.01483, 1.01515, 1.01505, 1.01463, 1.01396, 1.01312, 1.01217, 1.01116, 1.01011, 1.00908, 1.00807, 1.0071, 1.00619, 1.00534, 1.00457, 1.00387, 1.00323, 1.00267, 1.00217, 1.00174, 1.00137, 1.00105, 1.00078, 1.00055, 1.00036, 1.00021, 1.00008, 0.99999, 0.99991, 0.99986, 0.99982, 0.99979, 0.99978, 1);
        --md-sys-motion-effects-fast-duration: 225ms;
        --md-sys-motion-effects-fast-easing: linear(0, 0.09439, 0.27432, 0.45584, 0.60862, 0.72647, 0.8128, 0.87391, 0.91613, 0.94478, 0.96394, 0.97662, 0.98493, 0.99034, 0.99383, 0.99608, 0.99752, 0.99843, 0.99901, 0.99938, 0.99961, 0.99976, 0.99985, 0.99991, 0.99994, 0.99996, 0.99998, 1);
      }
      @media (prefers-reduced-motion: reduce) {
        :root {
          --md-sys-motion-spatial-fast-duration: 0ms !important;
          --md-sys-motion-spatial-medium-duration: 0ms !important;
          --md-sys-motion-effects-fast-duration: 0ms !important;
        }
      }

      [data-page="admin-system-package-manager"] #view {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      @media (max-width: 600px) {
        [data-page="admin-system-package-manager"] #view {
          gap: 0.5rem;
        }
      }
      [data-page="admin-system-package-manager"] #view > :is(h2, .cbi-map-descr) {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        clip-path: inset(50%) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      .cbi-tabmenu.mode {
        margin: 0.25rem auto 0.5rem !important;
        display: flex !important;
        justify-content: center !important;
        border: 0 !important;
        gap: 0.25rem !important;
        background: var(--md-sys-color-surface-container) !important;
        padding: 0.25rem !important;
        border-radius: 9999px !important;
        box-shadow: none !important;
        width: fit-content !important;
        max-width: 100% !important;
      }
      @media (max-width: 640px) {
        .cbi-tabmenu.mode {
          margin: 0 auto !important;
          padding: 0.2rem !important;
          gap: 0.2rem !important;
        }
        .cbi-tabmenu.mode > li > a {
          padding: 0.3125rem 0.65rem !important;
          font-size: 0.75rem !important;
        }
      }
      .cbi-tabmenu.mode > li {
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
      }
      .cbi-tabmenu.mode > li > a {
        display: inline-flex !important;
        align-items: center !important;
        padding: 0.375rem 1rem !important;
        border-radius: 9999px !important;
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        border: 0 !important;
        text-decoration: none !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    box-shadow var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
      }
      .cbi-tabmenu.mode > li > a:hover {
        color: var(--md-sys-color-on-surface) !important;
        background: var(--md-sys-color-surface-container-high) !important;
      }
      .cbi-tabmenu.mode > li.cbi-tab > a {
        background: var(--md-sys-color-secondary-container) !important;
        color: var(--md-sys-color-on-secondary-fixed, #141b2c) !important;
        font-weight: 600 !important;
        box-shadow: none !important;
      }
      [data-darkmode="true"] .cbi-tabmenu.mode > li.cbi-tab > a {
        color: var(--md-sys-color-on-secondary-container, #dbe2f9) !important;
      }

      /* Disk Space: Restrained M3E Horizontal Status Bar */
      .md3e-software-disk-card {
        background: var(--md-sys-color-surface-container-low) !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        border-radius: 9999px !important;
        padding: 0 1.25rem !important;
        min-height: 42px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 0.75rem 1.5rem !important;
        box-shadow: none !important;
        margin: 0 0 1rem 0 !important;
        transition: border-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
      }
      .md3e-software-disk-card.is-warning {
        border-color: color-mix(in oklab, var(--md-sys-color-tertiary, #f59e0b) 45%, transparent) !important;
      }
      .md3e-software-disk-card.is-critical {
        border-color: color-mix(in oklab, var(--md-sys-color-error) 45%, transparent) !important;
      }
      .md3e-disk-info {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.35rem !important;
        font-size: 0.8125rem !important;
        flex-wrap: wrap !important;
      }
      .md3e-disk-label {
        font-weight: 600 !important;
        color: var(--md-sys-color-on-surface) !important;
      }
      .md3e-disk-free {
        font-weight: 600 !important;
        color: var(--md-sys-color-primary) !important;
      }
      .md3e-software-disk-card.is-warning .md3e-disk-free {
        color: var(--md-sys-color-tertiary, #d97706) !important;
      }
      .md3e-software-disk-card.is-critical .md3e-disk-free {
        color: var(--md-sys-color-error) !important;
      }
      .md3e-disk-secondary {
        color: var(--md-sys-color-on-surface-variant) !important;
        font-variant-numeric: tabular-nums !important;
      }
      .md3e-disk-progress-wrap {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.75rem !important;
        flex-shrink: 0 !important;
      }
      .md3e-disk-badge {
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        font-variant-numeric: tabular-nums !important;
        white-space: nowrap !important;
      }
      .md3e-software-disk-card.is-warning .md3e-disk-badge {
        color: var(--md-sys-color-tertiary, #d97706) !important;
      }
      .md3e-software-disk-card.is-critical .md3e-disk-badge {
        color: var(--md-sys-color-error) !important;
      }
      .md3e-disk-progress-wrap .cbi-progressbar {
        width: 160px !important;
        max-width: 160px !important;
        min-width: 100px !important;
        height: 6px !important;
        min-height: 6px !important;
        max-height: 6px !important;
        background: var(--md-sys-color-surface-container-highest) !important;
        border-radius: 9999px !important;
        overflow: hidden !important;
        border: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        position: relative !important;
      }
      .md3e-disk-progress-wrap .cbi-progressbar[hidden] {
        display: none !important;
      }
      .md3e-disk-progress-wrap .cbi-progressbar > div {
        height: 100% !important;
        border-radius: 9999px !important;
        background: var(--md-sys-color-primary) !important;
        transition: width var(--md-sys-motion-spatial-medium-duration) var(--md-sys-motion-spatial-medium-easing),
                    background-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
        border: 0 !important;
        box-shadow: none !important;
      }
      .md3e-software-disk-card.is-warning .cbi-progressbar > div {
        background: var(--md-sys-color-tertiary, #f59e0b) !important;
      }
      .md3e-software-disk-card.is-critical .cbi-progressbar > div {
        background: var(--md-sys-color-error) !important;
      }
      @media (max-width: 640px) {
        .md3e-software-disk-card {
          border-radius: var(--md-sys-shape-corner-medium) !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.35rem !important;
          padding: 0.5rem 0.75rem !important;
          margin: 0 !important;
          min-height: auto !important;
        }
        .md3e-disk-info {
          font-size: 0.75rem !important;
          gap: 0.25rem !important;
        }
        .md3e-disk-progress-wrap {
          width: 100% !important;
          justify-content: space-between !important;
          gap: 0.5rem !important;
        }
        .md3e-disk-progress-wrap .cbi-progressbar {
          flex: 1 1 auto !important;
          max-width: none !important;
        }
      }

      /* Toolbar Section: Clean, Unboxed Layout */
      #maincontent .cbi-section.md3e-software-toolbar-section {
        container: md3e-software-toolbar / inline-size;
        background: transparent !important;
        border: 0 !important;
        padding: 0 !important;
        margin: 0 0 1rem 0 !important;
        box-shadow: none !important;
      }
      @media (max-width: 640px) {
        #maincontent .cbi-section.md3e-software-toolbar-section {
          margin: 0 !important;
          padding: 0 !important;
        }
      }
      .controls.md3e-software-toolbar {
        display: flex !important;
        flex-direction: column !important;
        gap: 0.875rem !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      @container md3e-software-toolbar (width < 40rem) {
        .controls.md3e-software-toolbar {
          gap: 0.5rem !important;
        }
      }
      .controls.md3e-software-toolbar > .md3e-tool-item {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        text-align: start !important;
        flex: 1 1 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        white-space: normal !important;
        box-sizing: border-box !important;
      }
      @container md3e-software-toolbar (width >= 57.5rem) {
        .controls.md3e-software-toolbar {
          display: grid !important;
          grid-template-columns: minmax(300px, 1.25fr) minmax(300px, 1fr) !important;
          gap: 1rem 1.75rem !important;
        }
        .controls.md3e-software-toolbar > .md3e-tool-filter { grid-column: 1; grid-row: 1; }
        .controls.md3e-software-toolbar > .md3e-tool-install { grid-column: 1; grid-row: 2; }
        .controls.md3e-software-toolbar > .md3e-tool-actions { grid-column: 2; grid-row: 1; }
        .controls.md3e-software-toolbar > .md3e-tool-i18n { grid-column: 2; grid-row: 2; }
      }
      .md3e-tool-item > label {
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        margin: 0 0 0.375rem 0 !important;
        display: block !important;
        text-align: start !important;
      }
      @container md3e-software-toolbar (width < 40rem) {
        .md3e-tool-item > label {
          margin: 0 0 0.25rem 0 !important;
          font-size: 0.75rem !important;
        }
      }

      /* Filter & Download: Bounded Pill Input Group */
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        gap: 0 !important;
        width: 100% !important;
        max-width: 32rem !important;
        position: relative !important;
      }
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group > input[type="text"] {
        flex: 1 1 auto !important;
        height: 40px !important;
        min-height: 40px !important;
        max-height: 40px !important;
        min-width: 0 !important;
        padding: 0 1rem !important;
        border-radius: 9999px 0 0 9999px !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        border-right: 0 !important;
        background: var(--md-sys-color-surface-container-highest) !important;
        color: var(--md-sys-color-on-surface) !important;
        font-size: 0.875rem !important;
        position: relative !important;
        z-index: 1 !important;
        box-sizing: border-box !important;
        transition: border-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    box-shadow var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
      }
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group > input[type="text"]:focus {
        border-color: var(--md-sys-color-primary) !important;
        box-shadow: inset 0 0 0 1px var(--md-sys-color-primary) !important;
        outline: none !important;
        z-index: 2 !important;
      }
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group > :is(button, .btn) {
        flex: 0 0 auto !important;
        height: 40px !important;
        min-height: 40px !important;
        max-height: 40px !important;
        padding: 0 1.25rem !important;
        margin: 0 0 0 -1px !important;
        border-radius: 0 9999px 9999px 0 !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        background: var(--md-sys-color-surface-container-high) !important;
        color: var(--md-sys-color-on-surface) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        z-index: 1 !important;
        box-sizing: border-box !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
      }
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group > :is(button, .btn):hover {
        background: var(--md-sys-color-surface-container-highest) !important;
      }
      :is(.md3e-tool-filter, .md3e-tool-install) .control-group > :is(button, .btn):active {
        transform: scale(0.97) !important;
      }
      .md3e-tool-install .control-group > :is(button, .btn) {
        background: var(--md-sys-color-primary) !important;
        color: var(--md-sys-color-on-primary) !important;
        border-color: var(--md-sys-color-primary) !important;
        font-weight: 600 !important;
      }
      .md3e-tool-install .control-group > :is(button, .btn):hover {
        background: color-mix(in oklab, var(--md-sys-color-primary) 88%, black) !important;
        border-color: color-mix(in oklab, var(--md-sys-color-primary) 88%, black) !important;
      }
      @container md3e-software-toolbar (width < 40rem) {
        :is(.md3e-tool-filter, .md3e-tool-install) .control-group > input[type="text"] {
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          padding: 0 0.75rem !important;
          font-size: 0.8125rem !important;
        }
        :is(.md3e-tool-filter, .md3e-tool-install) .control-group > :is(button, .btn) {
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          padding: 0 0.875rem !important;
          font-size: 0.75rem !important;
        }
      }

      /* Actions: Three Independent Pill Buttons with Restrained M3E Tonal Surfaces */
      .md3e-tool-actions .control-group {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.625rem !important;
        flex-wrap: wrap !important;
        max-width: 100% !important;
      }
      .md3e-tool-actions .control-group > :is(button, .btn) {
        height: 40px !important;
        min-height: 40px !important;
        max-height: 40px !important;
        padding: 0 1.125rem !important;
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        border-radius: 9999px !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        background: var(--md-sys-color-surface-container-high) !important;
        color: var(--md-sys-color-on-surface) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.375rem !important;
        margin: 0 !important;
        white-space: nowrap !important;
        box-sizing: border-box !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    border-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
      }
      .md3e-tool-actions .control-group > :is(button, .btn):hover {
        background: var(--md-sys-color-surface-container-highest) !important;
        border-color: var(--md-sys-color-outline) !important;
      }
      .md3e-tool-actions .control-group > :is(button, .btn):active {
        transform: scale(0.97) !important;
      }
      /* Button 1: Update lists... (Tonal Primary Container) */
      .md3e-tool-actions .control-group > :is(button, .btn)[data-command="update"],
      .md3e-tool-actions .control-group > :is(button, .btn).cbi-button-action {
        background: var(--md-sys-color-primary-container) !important;
        color: var(--md-sys-color-on-primary-container) !important;
        border-color: color-mix(in oklab, var(--md-sys-color-primary) 30%, transparent) !important;
        font-weight: 600 !important;
      }
      .md3e-tool-actions .control-group > :is(button, .btn)[data-command="update"]:hover,
      .md3e-tool-actions .control-group > :is(button, .btn).cbi-button-action:hover {
        background: color-mix(in oklab, var(--md-sys-color-primary-container) 85%, var(--md-sys-color-primary)) !important;
      }
      @container md3e-software-toolbar (width < 40rem) {
        .md3e-tool-actions .control-group {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          gap: 0.375rem !important;
          width: 100% !important;
        }
        .md3e-tool-actions .control-group > :is(button, .btn) {
          width: auto !important;
          flex: 0 1 auto !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          padding: 0 0.875rem !important;
          font-size: 0.75rem !important;
        }
      }

      /* i18n Segmented Controls: Pill Segmented Switch */
      .md3e-i18n-segmented {
        display: inline-flex !important;
        align-items: center !important;
        gap: 2px !important;
        padding: 3px !important;
        height: 40px !important;
        box-sizing: border-box !important;
        background: var(--md-sys-color-surface-container-high) !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        border-radius: 9999px !important;
        width: fit-content !important;
        max-width: 100% !important;
      }
      .md3e-i18n-segmented .md3e-i18n-pill {
        display: inline-flex !important;
        align-items: center !important;
        height: 32px !important;
        box-sizing: border-box !important;
        padding: 0 0.875rem !important;
        border-radius: 9999px !important;
        font-size: 0.75rem !important;
        font-weight: 500 !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        cursor: pointer !important;
        margin: 0 !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    box-shadow var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
      }
      .md3e-i18n-segmented .md3e-i18n-pill input[type="radio"] { display: none !important; }
      .md3e-i18n-segmented .md3e-i18n-pill:hover { color: var(--md-sys-color-on-surface) !important; }
      .md3e-i18n-segmented .md3e-i18n-pill.is-checked {
        background: var(--md-sys-color-surface) !important;
        color: var(--md-sys-color-on-surface) !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
      }
      @container md3e-software-toolbar (width < 40rem) {
        .md3e-i18n-segmented {
          height: 36px !important;
          padding: 2px !important;
        }
        .md3e-i18n-segmented .md3e-i18n-pill {
          height: 30px !important;
          padding: 0 0.625rem !important;
          font-size: 0.6875rem !important;
        }
      }

      /* Table Section — one shared tonal surface, matching Status data groups */
      #maincontent .cbi-section.md3e-software-table-section {
        border: 0 !important;
        margin: 0 !important;
        overflow: hidden !important;
        box-shadow: none !important;
      }
      @media (max-width: 640px) {
        #maincontent .cbi-section.md3e-software-toolbar-section {
          padding: 0 !important;
        }

      }

      #maincontent table#packages.md3e-software-table :is(tr, td) {
        background: transparent !important;
      }
      #maincontent table#packages.md3e-software-table :is(tr, th, td) {
        border-radius: 0 !important;
      }

      /* Desktop Table Layout (>= 601px) */
      @media (min-width: 601px) {
        #maincontent .md3e-software-table-section .md3e-data-scroll {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          width: 100% !important;
          border-radius: var(--md-sys-shape-corner-medium) !important;
        }
        table#packages.md3e-software-table,
        #maincontent table#packages.md3e-software-table {
          display: table !important;
          width: 100% !important;
          min-width: 620px !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          margin: 0.25rem 0 !important;
          overflow: visible !important;
        }
        #maincontent table#packages.md3e-software-table :is(thead, tbody) {
          display: table-row-group !important;
          width: 100% !important;
        }
        #maincontent table#packages.md3e-software-table :is(tr, .tr, .cbi-section-table-row, .cbi-section-table-titles, .table-titles) {
          display: table-row !important;
          position: static !important;
          width: auto !important;
          height: auto !important;
          clip: auto !important;
          overflow: visible !important;
          flex: none !important;
          flex-wrap: nowrap !important;
          grid-template-columns: none !important;
        }
        #maincontent table#packages.md3e-software-table :is(th, td, .th, .td, .cbi-section-table-cell) {
          display: table-cell !important;
          flex: none !important;
          width: auto !important;
          max-width: none !important;
        }
        #maincontent table#packages.md3e-software-table :is(th, td, .th, .td, .cbi-section-table-cell, [data-title])::before {
          display: none !important;
          content: none !important;
        }
        #maincontent table#packages.md3e-software-table tr th {
          background: transparent !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
          padding: 0.75rem 1rem !important;
          border-bottom: var(--_settings-divider) !important;
        }
        #maincontent table#packages.md3e-software-table tr th:last-child {
          text-align: right !important;
        }
        #maincontent table#packages.md3e-software-table tr th:nth-child(3) {
          text-align: right !important;
        }
        /* Column widths: Package(22%), Version(18%), Size(12%), Description(36%), Action(12%) */
        #maincontent table#packages.md3e-software-table :is(th:nth-child(1), td:nth-child(1)) {
          width: 22% !important;
          min-width: 140px !important;
        }
        #maincontent table#packages.md3e-software-table :is(th:nth-child(2), td:nth-child(2)) {
          width: 18% !important;
          min-width: 120px !important;
        }
        #maincontent table#packages.md3e-software-table :is(th:nth-child(3), td:nth-child(3)) {
          width: 12% !important;
          min-width: 80px !important;
        }
        #maincontent table#packages.md3e-software-table :is(th:nth-child(4), td:nth-child(4)) {
          width: 36% !important;
          min-width: 200px !important;
        }
        #maincontent table#packages.md3e-software-table :is(th:nth-child(5), td:nth-child(5)) {
          width: 12% !important;
          min-width: 90px !important;
        }
        #maincontent table#packages.md3e-software-table tr td {
          padding: 0.75rem 1rem !important;
          border-bottom: var(--_settings-divider) !important;
          font-size: 0.8125rem !important;
          color: var(--md-sys-color-on-surface) !important;
          vertical-align: middle !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(1) {
          font-family: var(--font-mono) !important;
          font-weight: 600 !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(1) ins {
          background: color-mix(in oklab, var(--md-sys-color-primary-container) 80%, transparent) !important;
          color: var(--md-sys-color-on-primary-container) !important;
          border-radius: 2px !important;
          padding: 0 2px !important;
          text-decoration: none !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(2) {
          font-family: var(--font-mono) !important;
          font-size: 0.75rem !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          white-space: nowrap !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(3) {
          font-family: var(--font-mono) !important;
          font-size: 0.75rem !important;
          text-align: right !important;
          white-space: nowrap !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(4) {
          color: var(--md-sys-color-on-surface-variant) !important;
          line-height: 1.4 !important;
          overflow-wrap: break-word !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) {
          text-align: right !important;
          white-space: nowrap !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > :is(button, .btn) {
          height: 30px !important;
          padding: 0 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          border-radius: 9999px !important;
          cursor: pointer !important;
          border: 0 !important;
          transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                      transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > :is(button, .btn):active {
          transform: scale(0.96) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-action {
          background: var(--md-sys-color-primary) !important;
          color: var(--md-sys-color-on-primary) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-action:hover {
          background: color-mix(in oklab, var(--md-sys-color-primary) 85%, black) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-positive {
          background: var(--md-sys-color-primary-container) !important;
          color: var(--md-sys-color-on-primary-container) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-negative {
          background: color-mix(in oklab, var(--md-sys-color-error) 15%, transparent) !important;
          color: var(--md-sys-color-error) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-neutral[disabled] {
          background: var(--md-sys-color-surface-container-high) !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        #maincontent table#packages.md3e-software-table tr:hover:not(.placeholder) td {
          background: var(--md-sys-color-surface-container) !important;
        }
        @media (max-width: 920px) {
          #maincontent table#packages.md3e-software-table {
            min-width: 0 !important;
          }
          #maincontent table#packages.md3e-software-table :is(th, td) {
            padding: 0.5rem 0.625rem !important;
          }
          #maincontent table#packages.md3e-software-table :is(th:nth-child(1), td:nth-child(1)) {
            min-width: 110px !important;
          }
          #maincontent table#packages.md3e-software-table :is(th:nth-child(2), td:nth-child(2)) {
            min-width: 85px !important;
          }
          #maincontent table#packages.md3e-software-table :is(th:nth-child(3), td:nth-child(3)) {
            min-width: 65px !important;
          }
          #maincontent table#packages.md3e-software-table :is(th:nth-child(4), td:nth-child(4)) {
            min-width: 160px !important;
          }
          #maincontent table#packages.md3e-software-table :is(th:nth-child(5), td:nth-child(5)) {
            min-width: 80px !important;
          }
        }
      }

      /* Mobile Card Transformation (<= 600px) — continuous rows, no per-row chrome */
      @media (max-width: 600px) {
        #maincontent .md3e-software-table-section .md3e-data-scroll {
          overflow-x: visible !important;
          width: 100% !important;
        }
        table#packages.md3e-software-table,
        #maincontent table#packages.md3e-software-table {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          min-width: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        #maincontent table#packages.md3e-software-table :is(thead, tbody) {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          width: 100% !important;
        }
        #maincontent table#packages.md3e-software-table :is(tr.table-titles, tr.cbi-section-table-titles) {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
          display: none !important;
        }
        #maincontent table#packages.md3e-software-table tr:not(.placeholder):not(.table-titles):not(.cbi-section-table-titles) {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          column-gap: 0.5rem !important;
          row-gap: 0.25rem !important;
          align-items: start !important;
          padding: 0.625rem 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          width: 100% !important;
          transition: background-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
        }
        #maincontent table#packages.md3e-software-table tr:not(.placeholder):not(:last-child) {
          border-bottom: var(--_settings-divider) !important;
        }
        #maincontent table#packages.md3e-software-table tr:not(.placeholder):hover {
          background: var(--md-sys-color-surface-container) !important;
        }
        #maincontent table#packages.md3e-software-table tr td {
          width: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(1) {
          grid-column: 1 / 2 !important;
          grid-row: 1 / 2 !important;
          font-family: var(--font-mono) !important;
          font-size: 0.8125rem !important;
          font-weight: 600 !important;
          color: var(--md-sys-color-on-surface) !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          align-self: center !important;
          padding: 0 !important;
          line-height: 1.3 !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(1) ins {
          background: color-mix(in oklab, var(--md-sys-color-primary-container) 80%, transparent) !important;
          color: var(--md-sys-color-on-primary-container) !important;
          border-radius: 2px !important;
          padding: 0 2px !important;
          text-decoration: none !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) {
          grid-column: 2 / 3 !important;
          grid-row: 1 / 2 !important;
          justify-self: end !important;
          align-self: center !important;
          padding: 0 !important;
          white-space: nowrap !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > :is(button, .btn) {
          height: 28px !important;
          min-height: 28px !important;
          max-height: 28px !important;
          padding: 0 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          border-radius: 9999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
          margin: 0 !important;
          cursor: pointer !important;
          border: 0 !important;
          transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                      transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > :is(button, .btn):active {
          transform: scale(0.96) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-action {
          background: var(--md-sys-color-primary) !important;
          color: var(--md-sys-color-on-primary) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-action:hover {
          background: color-mix(in oklab, var(--md-sys-color-primary) 85%, black) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-positive {
          background: var(--md-sys-color-primary-container) !important;
          color: var(--md-sys-color-on-primary-container) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-negative {
          background: color-mix(in oklab, var(--md-sys-color-error) 15%, transparent) !important;
          color: var(--md-sys-color-error) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(5) > .cbi-button-neutral[disabled] {
          background: var(--md-sys-color-surface-container-high) !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(2) {
          grid-column: 1 / 2 !important;
          grid-row: 2 / 3 !important;
          font-family: var(--font-mono) !important;
          font-size: 0.75rem !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          padding: 0.125rem 0 0 0 !important;
          overflow-wrap: anywhere !important;
          line-height: 1.3 !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(3) {
          grid-column: 2 / 3 !important;
          grid-row: 2 / 3 !important;
          font-family: var(--font-mono) !important;
          font-size: 0.75rem !important;
          color: var(--md-sys-color-outline) !important;
          text-align: right !important;
          padding: 0.125rem 0 0 0 !important;
          white-space: nowrap !important;
          align-self: center !important;
          line-height: 1.3 !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(4) {
          grid-column: 1 / 3 !important;
          grid-row: 3 / 4 !important;
          padding: 0.25rem 0 0 0 !important;
          color: var(--md-sys-color-on-surface-variant) !important;
          font-size: 0.8125rem !important;
          line-height: 1.4 !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 3 !important;
          line-clamp: 3 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          cursor: pointer !important;
          transition: color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(4):hover {
          color: var(--md-sys-color-on-surface) !important;
        }
        #maincontent table#packages.md3e-software-table tr td:nth-child(4).is-expanded {
          -webkit-line-clamp: unset !important;
          line-clamp: unset !important;
          overflow: visible !important;
        }
        #maincontent table#packages.md3e-software-table tr.placeholder {
          display: block !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #maincontent table#packages.md3e-software-table tr.placeholder td {
          display: block !important;
          width: 100% !important;
          padding: 0.75rem 0.25rem !important;
        }
      }

      /* Hide table headers during placeholder (empty / loading) */
      #maincontent table#packages.md3e-software-table:has(tr.placeholder) tr.cbi-section-table-titles,
      #maincontent table#packages.md3e-software-table.has-placeholder tr.cbi-section-table-titles {
        display: none !important;
      }

      /* Hide pager when table section is empty or has placeholder */
      #maincontent .cbi-section.md3e-software-table-section:has(tr.placeholder) .controls,
      #maincontent .cbi-section.md3e-software-table-section.has-placeholder .controls {
        display: none !important;
      }

      /* Centered Pill Pager */
      .md3e-pager-container {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 0.75rem 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }
      .md3e-pager-container.is-empty,
      .md3e-pager-container.is-loading,
      .md3e-pager-container[hidden] {
        display: none !important;
      }
      .md3e-pager-container > .pager {
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        display: inline-flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.375rem !important;
        background: var(--md-sys-color-surface-container) !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        border-radius: 9999px !important;
        padding: 0.25rem 0.5rem !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
      }
      .md3e-pager-container > .pager > * {
        flex-grow: 0 !important;
        flex-shrink: 0 !important;
      }
      .md3e-pager-container > .pager > :is(button, .btn) {
        width: 32px !important;
        height: 32px !important;
        border-radius: 9999px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        color: var(--md-sys-color-on-surface) !important;
        cursor: pointer !important;
        font-size: 1rem !important;
        line-height: 1 !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
      }
      .md3e-pager-container > .pager > :is(button, .btn):hover:not([disabled]) {
        background: var(--md-sys-color-surface-container-highest) !important;
      }
      .md3e-pager-container > .pager > :is(button, .btn):active:not([disabled]) {
        transform: scale(0.92) !important;
      }
      .md3e-pager-container > .pager > :is(button, .btn)[disabled] {
        opacity: 0.3 !important;
        cursor: not-allowed !important;
      }
      .md3e-pager-container > .pager > .text {
        font-size: 0.8125rem !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        font-weight: 500 !important;
        padding: 0 0.625rem !important;
        font-variant-numeric: tabular-nums !important;
        user-select: none !important;
      }
      @media (max-width: 640px) {
        .md3e-pager-container {
          padding: 0.5rem 0 !important;
        }
        .md3e-pager-container > .pager {
          padding: 0.2rem 0.375rem !important;
          gap: 0.25rem !important;
        }
        .md3e-pager-container > .pager > :is(button, .btn) {
          width: 28px !important;
          height: 28px !important;
          font-size: 0.875rem !important;
        }
        .md3e-pager-container > .pager > .text {
          font-size: 0.75rem !important;
          padding: 0 0.5rem !important;
        }
      }

      /* Empty & Loading States inside Placeholder: Restrained M3E */
      table#packages.md3e-software-table tr.placeholder td {
        padding: 1.75rem 1rem !important;
        text-align: center !important;
        border: 0 !important;
        background: transparent !important;
      }
      .md3e-empty-state {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0.5rem !important;
        padding: 1rem !important;
        margin: 0 auto !important;
        max-width: 440px !important;
        box-sizing: border-box !important;
        text-align: center !important;
        animation: md3eEmptyEnter var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
      }
      @keyframes md3eEmptyEnter {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      .md3e-empty-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 0.35rem !important;
      }
      .md3e-empty-title {
        font-size: 1rem !important;
        font-weight: 600 !important;
        color: var(--md-sys-color-on-surface) !important;
        line-height: 1.4 !important;
        margin: 0 !important;
      }
      .md3e-empty-title strong {
        color: var(--md-sys-color-primary) !important;
      }
      .md3e-empty-subtitle {
        font-size: 0.8125rem !important;
        color: var(--md-sys-color-on-surface-variant) !important;
        line-height: 1.4 !important;
        margin: 0 !important;
      }
      .md3e-empty-action {
        margin-top: 0.75rem !important;
        height: 34px !important;
        padding: 0 1.25rem !important;
        border-radius: 9999px !important;
        border: 1px solid var(--md-sys-color-outline-variant) !important;
        background: var(--md-sys-color-surface-container-high) !important;
        color: var(--md-sys-color-primary) !important;
        font-size: 0.8125rem !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.375rem !important;
        transition: background var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    border-color var(--md-sys-motion-effects-fast-duration) var(--md-sys-motion-effects-fast-easing),
                    transform var(--md-sys-motion-spatial-fast-duration) var(--md-sys-motion-spatial-fast-easing) !important;
      }
      .md3e-empty-action:hover {
        background: var(--md-sys-color-surface-container-highest) !important;
        border-color: var(--md-sys-color-primary) !important;
      }
      .md3e-empty-action:active {
        transform: scale(0.96) !important;
      }

      /* Loading State */
      .md3e-loading-state {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 1rem !important;
        padding: 3rem 1.5rem !important;
        margin: 0 auto !important;
      }
      .md3e-loading-spinner {
        width: 36px !important;
        height: 36px !important;
        border: 3px solid color-mix(in oklab, var(--md-sys-color-primary) 20%, transparent) !important;
        border-top-color: var(--md-sys-color-primary) !important;
        border-radius: 50% !important;
        animation: md3eSpin 800ms linear infinite !important;
      }
      @keyframes md3eSpin {
        to { transform: rotate(360deg); }
      }
      .md3e-loading-text {
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        color: var(--md-sys-color-on-surface-variant) !important;
      }
      @media (max-width: 640px) {
        .md3e-empty-state {
          padding: 0.75rem 0.5rem !important;
          gap: 0.25rem !important;
        }
        .md3e-empty-title {
          font-size: 0.9375rem !important;
        }
        .md3e-empty-subtitle {
          font-size: 0.75rem !important;
        }
        .md3e-empty-action {
          margin-top: 0.375rem !important;
          height: 32px !important;
          padding: 0 1rem !important;
          font-size: 0.75rem !important;
        }
        .md3e-loading-state {
          padding: 1.25rem 0.5rem !important;
          gap: 0.5rem !important;
        }
      }
      /* Narrow phones (320px): keep the empty state compact, no page overflow */
      @media (max-width: 380px) {
        table#packages.md3e-software-table tr.placeholder td {
          padding: 0.75rem 0 !important;
        }
        .md3e-empty-state {
          padding: 0.5rem 0 !important;
          gap: 0.25rem !important;
        }
        .md3e-loading-state {
          padding: 0.75rem 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  },

  styleSoftware(view) {
    this.ensureSoftwareStyles();

    // 1. Hide duplicate h2 and description copy
    const h2 = view.querySelector(":scope > h2");
    if (h2) {
      h2.classList.add("md3e-view-copy");
      h2.hidden = true;
    }
    const descr = view.querySelector(":scope > .cbi-map-descr");
    if (descr) {
      descr.classList.add("md3e-view-copy");
      descr.hidden = true;
    }

    // 2. Toolbar Section
    const firstSection = view.querySelector(":scope > .cbi-section");
    if (!firstSection) return;

    firstSection.classList.add("md3e-software-toolbar-section");
    const toolbar = firstSection.querySelector(":scope > .controls");
    if (!toolbar) return;
    toolbar.classList.add("md3e-software-toolbar");

    // 3. Disk Space Card
    const diskSpaceDiv = toolbar.querySelector("#disk-space-label")?.closest(".controls > div") ||
                         toolbar.querySelector(".cbi-progressbar")?.closest(".controls > div");

    if (diskSpaceDiv) {
      let diskCard = view.querySelector(".md3e-software-disk-card");
      if (!diskCard) {
        diskCard = E("div", {
          class: "md3e-software-disk-card",
          role: "region",
          "aria-label": _("Disk space")
        }, [
          E("div", { class: "md3e-disk-info" }, [
            E("span", { class: "md3e-disk-label" }, [_("Disk space") + ": "]),
            E("span", { class: "md3e-disk-free" }, ["…"]),
            E("span", { class: "md3e-disk-secondary" }, ["…"])
          ]),
          E("div", { class: "md3e-disk-progress-wrap" }, [
            E("span", { class: "md3e-disk-badge" }, ["…"])
          ])
        ]);
        firstSection.before(diskCard);
      }

      const pg = diskSpaceDiv.querySelector(".cbi-progressbar");
      const progressWrap = diskCard.querySelector(".md3e-disk-progress-wrap");
      if (pg && progressWrap && pg.parentElement !== progressWrap) {
        pg.querySelectorAll(".md3e-progress-ring").forEach(r => r.remove());
        pg.classList.add("md3e-linear-progress");
        // The adjacent text already exposes the same usage value.
        pg.setAttribute("aria-hidden", "true");
        progressWrap.appendChild(pg);
        diskSpaceDiv.style.display = "none";
      }

      if (pg) {
        const fill = pg.firstElementChild;
        const updateStats = () => {
          const title = pg.getAttribute("title") || "";
          const freeEl = diskCard.querySelector(".md3e-disk-free");
          const secEl = diskCard.querySelector(".md3e-disk-secondary");
          const badgeEl = diskCard.querySelector(".md3e-disk-badge");
          if (!freeEl || !secEl || !badgeEl) return;

          const details = title.match(
            /^(\d+(?:\.\d+)?)%\s*used\s*\(([^)]+?)\s*(?:used\s+of|\/)\s*([^,]+?),\s*([^)]+?)\s*free\)$/i,
          );
          const inlinePct = fill?.style.width.match(/^(\d+(?:\.\d+)?)%$/)?.[1];
          const pct = Number(inlinePct ?? details?.[1]);
          const amounts = title.match(/\d+(?:[.,]\d+)?\s*(?:[KMGTPEZY]i?)?B\b/gi);
          const hasDetails = amounts?.length === 3;
          // LuCI reports 100% with three zero amounts if it cannot find a mount.
          const noCapacity = hasDetails && amounts.every((amount) =>
            /^0+(?:[.,]0+)?\s*[a-z]+$/i.test(amount),
          );
          const known = Number.isFinite(pct) && pct >= 0 && pct <= 100 && !noCapacity;

          freeEl.textContent = !known ? _("Usage unavailable")
            : details ? _("%s free").format(details[4].trim()) : "";
          secEl.textContent = !known ? ""
            : details ? _("(%s / %s used)").format(details[2].trim(), details[3].trim())
            : hasDetails ? title : "";
          // Keep a complete localized summary intact if its fields cannot be
          // split safely. Its own percentage already labels the bar.
          badgeEl.textContent = known && (details || !hasDetails)
            ? _("%s used").format(pct + "%") : "";
          pg.hidden = !known || inlinePct == null;

          const critical = known && pct >= 90;
          const warning = known && pct >= 80 && pct < 90;
          for (const el of [diskCard, pg]) {
            el.classList.toggle("is-critical", critical);
            el.classList.toggle("is-warning", warning);
          }
        };

        updateStats();

        if (!pg._md3eDiskObserver) {
          const observer = new MutationObserver(updateStats);
          observer.observe(pg, { attributes: true, attributeFilter: ["title"] });
          if (fill)
            observer.observe(fill, { attributes: true, attributeFilter: ["style"] });
          pg._md3eDiskObserver = observer;
        }
      }
    }

    // 4. Toolbar Controls
    const filterDiv = toolbar.querySelector("#filter-label")?.closest(".controls > div");
    if (filterDiv) filterDiv.classList.add("md3e-tool-item", "md3e-tool-filter");

    const installDiv = toolbar.querySelector("#download-label")?.closest(".controls > div");
    if (installDiv) installDiv.classList.add("md3e-tool-item", "md3e-tool-install");

    const actionsDiv = toolbar.querySelector("#action-label")?.closest(".controls > div");
    if (actionsDiv) actionsDiv.classList.add("md3e-tool-item", "md3e-tool-actions");

    const i18nDiv = toolbar.querySelector("input[name='filter_i18n']")?.closest(".controls > div");
    if (i18nDiv) {
      i18nDiv.classList.add("md3e-tool-item", "md3e-tool-i18n");
      const i18nWrap = i18nDiv.querySelector(":scope > div");
      if (i18nWrap && !i18nWrap.classList.contains("md3e-i18n-segmented")) {
        i18nWrap.classList.add("md3e-i18n-segmented");
        i18nWrap.querySelectorAll("label").forEach(lbl => {
          lbl.classList.add("md3e-i18n-pill");
          const radio = lbl.querySelector("input[type='radio']");
          if (radio) {
            lbl.classList.toggle("is-checked", radio.checked);
            if (!radio._md3eChangeHooked) {
              radio._md3eChangeHooked = true;
              radio.addEventListener("change", () => {
                i18nWrap.querySelectorAll(".md3e-i18n-pill").forEach(l => {
                  const r = l.querySelector("input[type='radio']");
                  l.classList.toggle("is-checked", !!r?.checked);
                });
              });
            }
          }
        });
      }
    }

    // 5. Table and Empty State / Pager Handling
    const secondSection = view.querySelectorAll(":scope > .cbi-section")[1];
    if (secondSection) {
      secondSection.classList.add("md3e-software-table-section", "md3e-tonal-data");

      const table = secondSection.querySelector("table#packages");
      if (table) {
        table.classList.add("md3e-software-table");

        if (!table.parentElement.classList.contains("md3e-data-scroll")) {
          const scrollWrap = E("div", {
            class: "md3e-data-scroll",
            role: "region",
            tabindex: "0",
            "aria-label": _("Software packages")
          });
          table.before(scrollWrap);
          scrollWrap.append(table);
        }

        const placeholderTr = table.querySelector("tr.placeholder");
        table.classList.toggle("has-placeholder", !!placeholderTr);
        secondSection.classList.toggle("has-placeholder", !!placeholderTr);

        const spinning = table.querySelector(".spinning");
        const isSpinning = !!spinning;
        const filterInput = toolbar.querySelector("input[name='filter']");
        const filterVal = filterInput?.value?.trim() || "";

        const activeTab = view.querySelector(".cbi-tabmenu.mode > li.cbi-tab");
        const activeMode = activeTab?.getAttribute("data-mode") || "available";

        if (!window._md3eCbiTableHooked && typeof window.cbi_update_table === "function") {
          window._md3eCbiTableHooked = true;
          const origCbiUpdateTable = window.cbi_update_table;
          window.cbi_update_table = function(target, rows, placeholder) {
            try {
              const curTab = document.querySelector(".cbi-tabmenu.mode > li.cbi-tab");
              const curMode = curTab?.getAttribute("data-mode") || "available";
              const curFilter = document.querySelector("input[name='filter']")?.value?.trim() || "";
              if (curMode === "available" && !curFilter) {
                window._md3eAvailablePackagesLoaded = Array.isArray(rows) && rows.length > 0;
              }
            } catch (_) {}
            const res = origCbiUpdateTable.apply(this, arguments);
            try {
              const tbl = typeof target === 'string' ? document.querySelector(target) : target;
              if (tbl && tbl.id === 'packages') {
                const isMob = window.innerWidth <= 600;
                tbl.querySelectorAll('tr:not(.placeholder):not(.table-titles):not(.cbi-section-table-titles) > td:nth-child(4)').forEach(td => {
                  if (!td.hasAttribute('title') && td.textContent.trim()) {
                    td.setAttribute('title', td.textContent.trim());
                  }
                  if (isMob && !td.hasAttribute('tabindex')) {
                    td.setAttribute('tabindex', '0');
                    td.setAttribute('role', 'button');
                    td.setAttribute('aria-expanded', td.classList.contains('is-expanded') ? 'true' : 'false');
                    td.setAttribute('aria-label', _('Package description (press Enter to expand)'));
                  } else if (!isMob && td.hasAttribute('tabindex')) {
                    td.removeAttribute('tabindex');
                    td.removeAttribute('role');
                    td.removeAttribute('aria-expanded');
                    td.removeAttribute('aria-label');
                  }
                });
              }
            } catch (_) {}
            return res;
          };
        }

        if (window._md3eAvailablePackagesLoaded === undefined && activeMode === "available" && !filterVal) {
          if (placeholderTr) {
            window._md3eAvailablePackagesLoaded = false;
          } else if (table.querySelectorAll("tr:not(.placeholder):not(.table-titles):not(.cbi-section-table-titles)").length > 0) {
            window._md3eAvailablePackagesLoaded = true;
          }
        }

        if (placeholderTr) {
          const td = placeholderTr.querySelector("td");
          if (td) {
            td.colSpan = 5;

            if (isSpinning) {
              td.className = "md3e-table-loading";
              if (!td.querySelector(".md3e-loading-state")) {
                const loadingWrapper = E("div", { class: "md3e-loading-state" }, [
                  E("div", { class: "md3e-loading-spinner", "aria-hidden": "true" }),
                  E("div", { class: "md3e-loading-text" }, [_("Loading package information…")])
                ]);
                td.replaceChildren(loadingWrapper);
              }
            } else if (filterVal) {
              // FILTERED EMPTY STATE (Baseline)
              td.className = "md3e-table-empty";
              if (!td.querySelector(".md3e-empty-state.is-filtered")) {
                const emptyWrapper = E("div", { class: "md3e-empty-state is-filtered" }, [
                  E("div", { class: "md3e-empty-content" }, [
                    E("h3", { class: "md3e-empty-title" }, [
                      document.createTextNode(_("No packages matching") + " "),
                      E("strong", {}, [`"${filterVal}"`])
                    ]),
                    E("p", { class: "md3e-empty-subtitle" }, [
                      _("Check for typos or try clearing your search filter.")
                    ])
                  ]),
                  E("button", {
                    type: "button",
                    class: "btn cbi-button md3e-empty-action",
                    click: () => {
                      if (filterInput) {
                        filterInput.value = "";
                        filterInput.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                      const clearBtn = toolbar.querySelector(".md3e-tool-filter button");
                      if (clearBtn) clearBtn.click();
                    }
                  }, [
                    E("span", {}, [_("Clear filter")])
                  ])
                ]);
                td.replaceChildren(emptyWrapper);
              }
            } else {
              // TAB EMPTY STATE (Baseline: No filter, 0 packages)
              td.className = "md3e-table-empty";
              if (!td.querySelector(".md3e-empty-state:not(.is-filtered)")) {
                let titleText, subtitleText;

                if (activeMode === "updates") {
                  if (window._md3eAvailablePackagesLoaded) {
                    titleText = _("All packages are up to date");
                    subtitleText = _("Your system has the latest available package versions.");
                  } else {
                    titleText = _("No update information available");
                    subtitleText = _("Package lists may be empty or not yet downloaded.");
                  }
                } else if (activeMode === "available") {
                  titleText = _("No packages available");
                  subtitleText = _("Package lists may be empty or not yet downloaded.");
                } else {
                  titleText = _("No packages found");
                  subtitleText = _("No packages match current configuration.");
                }

                const emptyWrapper = E("div", { class: "md3e-empty-state" }, [
                  E("div", { class: "md3e-empty-content" }, [
                    E("h3", { class: "md3e-empty-title" }, [titleText]),
                    E("p", { class: "md3e-empty-subtitle" }, [subtitleText])
                  ])
                ]);
                td.replaceChildren(emptyWrapper);
              }
            }
          }
        }

        if (!table._md3eDescExpandHooked) {
          table._md3eDescExpandHooked = true;
          const toggleDesc = (descTd) => {
            if (!descTd || window.innerWidth > 600) return;
            const isExp = descTd.classList.toggle("is-expanded");
            descTd.setAttribute("aria-expanded", isExp ? "true" : "false");
          };
          const findDescCell = (el) =>
            el.closest("td.col-10, td[data-title='Description']") ||
            el.closest(`td[data-title="${_("Description")}"]`);
          table.addEventListener("click", (e) => {
            const descTd = findDescCell(e.target);
            if (descTd) toggleDesc(descTd);
          });
          table.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              const descTd = findDescCell(e.target);
              if (descTd) {
                e.preventDefault();
                toggleDesc(descTd);
              }
            }
          });
        }

        table.querySelectorAll("tr:not(.placeholder) > td:nth-child(4)").forEach(td => {
          if (!td.hasAttribute("title") && td.textContent.trim()) {
            td.setAttribute("title", td.textContent.trim());
          }
          if (window.innerWidth <= 600 && !td.hasAttribute("tabindex")) {
            td.setAttribute("tabindex", "0");
            td.setAttribute("role", "button");
            td.setAttribute("aria-expanded", td.classList.contains("is-expanded") ? "true" : "false");
            td.setAttribute("aria-label", _("Package description (press Enter to expand)"));
          } else if (window.innerWidth > 600 && td.hasAttribute("tabindex")) {
            td.removeAttribute("tabindex");
            td.removeAttribute("role");
            td.removeAttribute("aria-expanded");
            td.removeAttribute("aria-label");
          }
        });

        if (!window._md3eSoftwareResizeHooked) {
          window._md3eSoftwareResizeHooked = true;
          window.addEventListener("resize", () => {
            const isMob = window.innerWidth <= 600;
            table.querySelectorAll("tr:not(.placeholder) > td:nth-child(4)").forEach(td => {
              if (isMob && !td.hasAttribute("tabindex")) {
                td.setAttribute("tabindex", "0");
                td.setAttribute("role", "button");
                td.setAttribute("aria-expanded", td.classList.contains("is-expanded") ? "true" : "false");
                td.setAttribute("aria-label", _("Package description (press Enter to expand)"));
              } else if (!isMob && td.hasAttribute("tabindex")) {
                td.removeAttribute("tabindex");
                td.removeAttribute("role");
                td.removeAttribute("aria-expanded");
                td.removeAttribute("aria-label");
              }
            });
          });
        }
      }

      // Pagers handling
      const pagers = secondSection.querySelectorAll(".controls");
      const hasPlaceholder = !!table?.querySelector("tr.placeholder");
      const isSpinning = !!table?.querySelector(".spinning");

      pagers.forEach(pagerWrap => {
        pagerWrap.classList.add("md3e-pager-container");
        const pager = pagerWrap.querySelector(".pager");
        const text = pager?.querySelector(".text")?.textContent.trim() || "";
        const isEmpty = text === _("No packages") || text === "No packages" || hasPlaceholder;

        pagerWrap.classList.toggle("is-empty", isEmpty);
        pagerWrap.classList.toggle("is-loading", isSpinning);

        if (isEmpty || isSpinning) {
          pagerWrap.hidden = true;
          pagerWrap.style.setProperty("display", "none", "important");
        } else {
          pagerWrap.hidden = false;
          pagerWrap.style.removeProperty("display");
        }
      });
    }
  },

});
