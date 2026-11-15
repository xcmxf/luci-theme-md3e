"use strict";
"require baseclass";

function styleOverviewGroup(heading, title, key, openPorts) {
  const section = heading?.closest(".cbi-section");
  const body = section?.querySelector(":scope > .cbi-title + div");
  const toggle = heading?.querySelector(
    '[data-clickable][data-indicator="poll-status"]',
  );
  if (!body || !toggle) return;

  if (!section.classList.contains("md3e-parameter-group")) {
    section.classList.add("md3e-parameter-group");
    body.id = `md3e-${key}-parameters`;
    toggle.setAttribute("role", "button");
    toggle.setAttribute("aria-controls", body.id);
    toggle.tabIndex = 0;
    toggle.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle.click();
      toggle.focus({ preventScroll: true });
    });
  }
  const expanded = String(toggle.dataset.style !== "active");
  if (toggle.getAttribute("aria-expanded") !== expanded)
    toggle.setAttribute("aria-expanded", expanded);
  const label = _("%s: %s").format(title, toggle.textContent.trim());
  if (toggle.getAttribute("aria-label") !== label)
    toggle.setAttribute("aria-label", label);

  if (key === "ports") {
    stylePortStatus(body, openPorts);
    return;
  }
  if (key === "leases" || key === "wireless") {
    styleOverviewTables(body, title);
    return;
  }

  const table = body.querySelector(":scope > table");
  if (!table) return;
  const rows = Array.from(table.rows);
  if (
    !rows.length ||
    !rows.every(
      (row) =>
        row.cells.length === 2 &&
        Array.from(row.cells).every(
          (cell) =>
            cell.tagName === "TD" && cell.colSpan === 1 && cell.rowSpan === 1,
        ),
    )
  )
    return;

  // LuCI owns the values and replaces this table on each poll.
  const list = E(
    "dl",
    { class: "md3e-parameter-list" },
    rows.map(({ cells }) =>
      E("div", { class: "md3e-parameter-row" }, [
        E("dt", {}, Array.from(cells[0].childNodes)),
        E("dd", {}, Array.from(cells[1].childNodes)),
      ]),
    ),
  );
  if (key === "network") formatConnectionPercent(list);
  table.replaceWith(list);
}

function renderPortAssociations(source) {
  const nodes = Array.from(source.childNodes).filter(
    (node) =>
      node.nodeName !== "BR" &&
      (node.nodeType !== Node.TEXT_NODE || node.textContent.trim()),
  );
  const [label, ...badges] = nodes;
  if (
    label?.nodeType !== Node.TEXT_NODE ||
    !badges.every((node) => node.matches?.(".ifacebadge"))
  )
    return E("div", Array.from(source.childNodes));

  const chips = badges.map((badge) => {
    const zone = badge.querySelector(":scope > .zonebadge[title]");
    const device = badge.querySelector(":scope > img[title], :scope > em");
    const name = Array.from(badge.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join("")
      .trim()
      .replace(/:\s*$/, "");
    // Keep unfamiliar badges intact, including any links or controls.
    if (
      !name ||
      !zone ||
      !device ||
      badge.children.length !== 2 ||
      zone.children.length ||
      device.children.length
    )
      return badge;

    const deviceState = device.matches("img")
      ? /_disabled\.svg(?:\?|$)/.test(device.getAttribute("src"))
        ? _("Device is not active")
        : _("Device is active")
      : "";
    const description = [
      zone.title,
      device.title || device.textContent.trim(),
      deviceState,
    ]
      .filter(Boolean)
      .join(" · ");
    badge.classList.remove("ifacebadge");
    badge.classList.add("md3e-port-network-chip");
    badge.removeAttribute("style");
    if (description) {
      badge.tabIndex = 0;
      badge.dataset.tooltip = description;
      badge.setAttribute("aria-description", description);
    }
    badge.replaceChildren(name);
    return badge;
  });

  return E("div", { class: "md3e-port-associations" }, [
    E("span", label.textContent.trim()),
    ...chips,
  ]);
}

function renderPortCounters(source, readings) {
  const itemlist = source.firstElementChild;
  if (source.childNodes.length !== 1 || !itemlist)
    return E("div", Array.from(source.childNodes));

  const items = Array.from(itemlist.childNodes).filter(
    (node) =>
      node.nodeName !== "BR" &&
      (node.nodeType !== Node.TEXT_NODE || node.textContent.trim()),
  );
  if (
    !items.every(
      (item) =>
        item.matches?.(".nowrap") && item.firstChild?.matches?.("strong"),
    )
  )
    return E("div", Array.from(source.childNodes));

  const rx = [
    _("Received bytes"),
    _("Received packets"),
    _("Receive errors"),
    _("Receive dropped"),
    _("Received multicast"),
  ];
  const tx = [
    _("Transmitted bytes"),
    _("Transmitted packets"),
    _("Transmit errors"),
    _("Transmit dropped"),
    _("Collisions seen"),
  ];
  const counters = items.map((item) => ({
    label: item.firstChild.textContent.trim().replace(/:$/, ""),
    value: Array.from(item.childNodes).slice(1),
  }));
  const renderList = (items) =>
    E(
      "dl",
      { class: "md3e-port-counter-list" },
      items.map(({ label, value }) =>
        E("div", {}, [E("dt", label), E("dd", value)]),
      ),
    );
  const renderDirection = (label, icon, keys, summary) => {
    const group = keys
      .flatMap((key) => counters.filter((item) => item.label === key))
      .filter(
        ({ label, value }) =>
          label !== keys[0] ||
          value
            .map((node) => node.textContent)
            .join("")
            .trim() !== summary,
      );
    return group.length
      ? E("div", { class: "md3e-port-counter-group" }, [
          E("h4", { class: "md3e-port-counter-title" }, [
            E("span", { "aria-hidden": "true" }, icon),
            label,
          ]),
          renderList(group),
        ])
      : null;
  };
  const directions = [
    renderDirection(_("RX"), "↓", rx, readings.get("▼")),
    renderDirection(_("TX"), "↑", tx, readings.get("▲")),
  ].filter(Boolean);
  const additional = counters.filter(
    ({ label }) => !rx.includes(label) && !tx.includes(label),
  );

  return E(
    [],
    [
      directions.length
        ? E("div", { class: "md3e-port-counters" }, directions)
        : null,
      additional.length
        ? E("div", { class: "md3e-port-counter-extra" }, renderList(additional))
        : null,
    ].filter(Boolean),
  );
}

function stylePortStatus(body, openPorts) {
  const grid = body.querySelector(
    ":scope > div:not([class]), :scope > .md3e-port-card-grid",
  );
  if (!grid || grid.classList.contains("md3e-overview-ports")) return;
  const ports = Array.from(grid.children);
  if (ports.some((port) => !port.matches(".ifacebox"))) return;
  grid.className = "md3e-overview-ports";
  grid.removeAttribute("style");
  if (!ports.length)
    grid.append(
      E("p", { class: "md3e-overview-empty" }, _("No Ethernet ports detected")),
    );

  ports.forEach((port, index) => {
    const name = port
      .querySelector(":scope > .ifacebox-head:first-child")
      ?.textContent.trim();
    const link = port.querySelector(":scope > .ifacebox-body");
    const zones = port.querySelector(
      ":scope > .ifacebox-head.cbi-tooltip-container > .cbi-tooltip",
    );
    const traffic = port.querySelector(
      ":scope > .ifacebox-body:last-child > .cbi-tooltip-container",
    );
    const stats = traffic?.querySelector(":scope > .cbi-tooltip");
    const icon = link?.querySelector("img");
    const linkState = icon
      ?.getAttribute("src")
      ?.match(/port_(?:pse_)?(up|down)\.svg(?:\?|$)/)?.[1];
    if (!name || !linkState || !stats || !zones) return;

    const readings = new Map();
    const extra = [];
    for (const node of Array.from(traffic.childNodes)) {
      if (node === stats || node.nodeName === "BR") continue;
      const reading =
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim().match(/^([▲▼])\s*(.+)$/u);
      if (reading) readings.set(reading[1], reading[2]);
      else if (node.textContent.trim() || node.nodeType === Node.ELEMENT_NODE)
        extra.push(node);
    }
    if (!readings.has("▲") || !readings.has("▼")) return;

    const connected = linkState === "up";
    const state = connected ? _("Connected") : _("no link");
    const linkInfo = Array.from(link.childNodes).filter(
      (node) =>
        node !== icon &&
        node.nodeName !== "BR" &&
        node.textContent.trim() !== state,
    );
    const detailsKey = `${index}:${name}`;
    const details = E("details", { class: "md3e-overview-port-details" }, [
      E("summary", _("Port details")),
      E("div", { class: "md3e-port-details-panel" }, [
        renderPortAssociations(zones),
        renderPortCounters(stats, readings),
      ]),
    ]);
    details.open = openPorts.has(detailsKey);
    details.addEventListener("toggle", () => {
      if (details.open) openPorts.add(detailsKey);
      else openPorts.delete(detailsKey);
    });

    const metric = (label, direction) =>
      E("div", {}, [E("dt", label), E("dd", readings.get(direction))]);
    const row = E(
      "div",
      { class: "md3e-overview-port", "data-link-state": linkState },
      [
        E("div", { class: "md3e-overview-port-identity" }, [
          E("span", {
            class: "md3e-overview-port-icon",
            "aria-hidden": "true",
          }),
          E("div", {}, [
            E("strong", name),
            E("div", { class: "md3e-overview-port-state" }, [
              E("span", state),
              ...linkInfo,
              ...extra,
            ]),
          ]),
        ]),
        E("dl", { class: "md3e-overview-port-traffic" }, [
          metric(_("RX"), "▼"),
          metric(_("TX"), "▲"),
        ]),
        details,
      ],
    );
    port.replaceWith(row);
  });
}

function styleLeaseCards(table) {
  const [head, ...rows] = table.rows;
  const headers = Array.from(head?.cells ?? []);
  if (
    !rows.length ||
    !head.matches(".table-titles") ||
    !headers.every(
      (cell) =>
        cell.matches("th[scope=col]") &&
        cell.colSpan === 1 &&
        cell.rowSpan === 1,
    ) ||
    !rows.every(
      (row) =>
        row.cells.length <= headers.length &&
        Array.from(row.cells).every(
          (cell) =>
            cell.tagName === "TD" && cell.colSpan === 1 && cell.rowSpan === 1,
        ),
    )
  )
    return;

  // Keep the native table, sort targets and action nodes. Explicit roles
  // preserve table semantics when the narrow layout changes CSS display.
  table.classList.add("md3e-lease-cards");
  table.setAttribute("role", "table");
  head.setAttribute("role", "row");
  for (const group of table.querySelectorAll(":scope > :is(thead, tbody)"))
    group.setAttribute("role", "rowgroup");
  for (const header of headers) header.setAttribute("role", "columnheader");

  for (const row of rows) {
    row.setAttribute("role", "row");
    Array.from(row.cells).forEach((cell, index) => {
      const header = headers[index];
      const label = cell.dataset.title || header.textContent.trim();
      cell.setAttribute("role", "cell");
      if (header.classList.contains("cbi-section-actions")) {
        cell.classList.add("md3e-lease-actions");
      } else if (
        label === _("Hostname") ||
        label === _("IPv4 address") ||
        label === _("IPv6 addresses")
      ) {
        cell.classList.add("md3e-lease-identity");
      }
      if (label === _("IPv6 addresses"))
        cell.classList.add("md3e-lease-addresses");
      if (
        label === _("IPv4 address") ||
        label === _("MAC address") ||
        label === _("IAID")
      )
        cell.classList.add("md3e-lease-short-id");
      // Leave the cell's textContent intact for LuCI's sorting.
      cell.prepend(
        E("span", {
          class: "md3e-lease-label",
          "aria-hidden": "true",
          "data-label": label,
        }),
      );
    });
  }
}

function styleOverviewTables(body, title) {
  const empty = body.querySelector(":scope > em");
  empty?.classList.add("md3e-overview-empty");
  for (const table of body.querySelectorAll(":scope > table")) {
    // LuCI keeps a placeholder row when only one address family has leases.
    const placeholder = table.rows[1]?.cells[0];
    const message = placeholder?.firstElementChild;
    if (
      table.matches(".leases, .leases6") &&
      table.rows.length === 2 &&
      table.rows[1].cells.length === 1 &&
      table.rows[1].classList.contains("placeholder") &&
      message?.matches("em:only-child")
    ) {
      message.classList.add("md3e-overview-empty");
      table.replaceWith(message);
      continue;
    }
    for (const header of table.querySelectorAll(
      "tr.table-titles > th:not([scope])",
    ))
      header.scope = "col";
    if (table.matches(".leases, .leases6")) styleLeaseCards(table);
    const heading = table.previousElementSibling;
    const wrapper = E("div", {
      class: "md3e-overview-data-scroll",
      role: "region",
      "aria-label": heading?.matches("h3") ? heading.textContent : title,
      tabindex: "0",
    });
    table.before(wrapper);
    wrapper.append(table);
  }
}

function formatConnectionPercent(list) {
  const bar = list.querySelector(".cbi-progressbar[title]");
  const match = bar?.title.match(/^([0-9]+) \/ ([0-9]+) \(0%\)$/);
  if (!match || Number(match[1]) <= 0 || Number(match[2]) <= Number(match[1]))
    return;
  bar.title = bar.title.replace("(0%)", "(<1%)");
}

function styleOverviewParameters(view) {
  const groups = new Map([
    [_("System"), "system"],
    [_("Memory"), "memory"],
    [_("Storage"), "storage"],
    [_("Port status"), "ports"],
    [_("Network"), "network"],
    [_("DHCP Leases"), "leases"],
    [_("DSL"), "dsl"],
    [_("Wireless"), "wireless"],
  ]);
  const openPorts = new Set();
  const update = () => {
    const redundantHeading = document.querySelector(
      '#md3e-workspace > h2[name="content"]',
    );
    if (redundantHeading) {
      redundantHeading.hidden = true;
      redundantHeading.style.display = "none";
      redundantHeading.remove();
    }

    for (const heading of view.querySelectorAll(
      ".cbi-section > .cbi-title > h3",
    )) {
      const title = heading.firstChild?.textContent.trim();
      const key = groups.get(title);
      if (key) styleOverviewGroup(heading, title, key, openPorts);
    }
  };

  const observer = new MutationObserver(update);
  observer.observe(view, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-style"],
  });
  update();
}

return baseclass.extend({
  __init__() {
    const redundantHeading = document.querySelector(
      '#md3e-workspace > h2[name="content"]',
    );
    if (redundantHeading) {
      redundantHeading.hidden = true;
      redundantHeading.style.display = "none";
      redundantHeading.remove();
    }

    const view = document.getElementById("view");
    if (view) styleOverviewParameters(view);
  },
});
