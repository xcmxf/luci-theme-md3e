"use strict";
"require baseclass";
"require fs";
"require poll";
"require ui";
"require md3e.menu-md3e-v2";
"require view.status.processes as processesView";

const sameProcess = (a, b) =>
  a.PID === b.PID &&
  a.USER === b.USER &&
  a.COMMAND === b.COMMAND &&
  a.PPID === b.PPID;

return baseclass.extend({
  __init__() {
    const nativeUpdate = processesView.updateTable;
    if (
      typeof nativeUpdate !== "function" ||
      !HTMLElement.prototype.showPopover
    )
      return;

    // The stock view still owns loading, the route, and its error page.
    processesView.updateTable = (table, processes) => {
      if (
        table instanceof HTMLTableElement &&
        (table === this.table || table.matches(".cbi-section > .table"))
      ) {
        this.mount(table, processes);
      } else {
        nativeUpdate.call(processesView, table, processes);
      }
    };

    const table = document.querySelector("#view > .cbi-section > table.table");
    if (table) {
      processesView
        .load()
        .then((processes) => {
          if (table.isConnected) processesView.updateTable(table, processes);
        })
        .catch((error) => console.warn(error));
    }
  },

  mount(table, processes) {
    if (this.mounted && this.table === table) {
      this.updateRows(processes);
      return;
    }
    this.mounted = true;
    this.table = table;
    const section = table.parentElement;
    if (section && !section.classList.contains("md3e-data-group")) {
      section.classList.add("md3e-parameter-group", "md3e-data-group", "md3e-processes-group");
      const view = section.parentElement || document.getElementById("view");
      if (view) {
        const h2 = view.querySelector(":scope > h2");
        if (h2) { h2.classList.add("md3e-view-copy"); h2.hidden = true; }
        const descr = view.querySelector(":scope > .cbi-map-descr");
        if (descr) { descr.classList.add("md3e-view-copy"); descr.hidden = true; }
      }
      const scroll = E("div", {
        class: "md3e-data-scroll md3e-native-grid",
        "data-layout": "wide",
        role: "region",
        tabindex: 0,
        "aria-label": _("Processes")
      });
      table.before(scroll);
      scroll.append(table);
      scroll.before(
        E(
          "p",
          { class: "md3e-data-scroll-hint" },
          _("Scroll horizontally to see all columns")
        )
      );
    }
    this.rows = new Map();
    this.signalGeneration = 0;
    this.body = E("tbody", { role: "rowgroup" });
    this.feedback = E("div", {
      class: "md3e-process-feedback",
      role: "status",
    });
    this.refreshError = E("div", {
      class: "md3e-process-feedback",
      role: "status",
    });
    this.empty = E("tr", { class: "md3e-process-empty", role: "row" }, [
      E("td", { role: "cell", colspan: 6 }, [_("No information available")]),
    ]);

    this.columns = [
      ["pid", _("PID")],
      ["user", _("Owner")],
      ["command", _("Command")],
      ["cpu", _("CPU")],
      ["memory", _("Memory")],
      ["actions", _("Actions")],
    ];
    this.canSignal = L.hasViewPermission() !== false;
    if (this.canSignal) this.buildMenu();

    const headings = this.columns.map(([name, label]) =>
      E(
        "th",
        { class: "md3e-process-" + name, scope: "col", role: "columnheader" },
        [label],
      ),
    );
    table.className = "md3e-process-table";
    table.setAttribute("role", "table");
    table.setAttribute("aria-labelledby", "md3e-processes-title");
    table.replaceChildren(
      E("thead", { role: "rowgroup" }, [E("tr", { role: "row" }, headings)]),
      this.body,
    );
    table.parentElement.prepend(this.feedback, this.refreshError);
    if (this.menu) document.body.append(this.menu);
    this.updateRows(processes);

    poll.add(async () => {
      if (!table.isConnected || document.hidden || this.busy) return;
      const generation = this.signalGeneration;
      try {
        const current = await processesView.load();
        if (table.isConnected && generation === this.signalGeneration)
          this.updateRows(current);
        this.refreshError.textContent = "";
      } catch {
        this.refreshError.textContent = _(
          "Could not refresh the process list.",
        );
      }
    });
  },

  makeRow(process) {
    const cells = this.columns.map(([name, label]) =>
      E("td", {
        class: "md3e-process-" + name,
        "data-label": label,
        role: "cell",
      }),
    );
    let trigger;
    if (this.canSignal) {
      trigger = E(
        "button",
        {
          type: "button",
          class: "md3e-row-menu-trigger",
          "aria-label": _("Actions for PID %s").format(process.PID),
          "aria-controls": this.menu.id,
          "aria-expanded": "false",
          click: () => this.openMenu(row),
        },
        [E("span", { "aria-hidden": "true" }, ["⋯"])],
      );
      cells.at(-1).append(trigger);
    }

    const row = {
      element: E("tr", { role: "row" }, cells),
      process,
      cells,
      trigger,
    };
    return row;
  },

  updateRows(processes) {
    const sorted = processes
      .filter(
        (process) =>
          /^\d+$/.test(process.PID) &&
          Number.isSafeInteger(Number(process.PID)) &&
          Number(process.PID) > 0,
      )
      .sort((a, b) => Number(a.PID) - Number(b.PID));
    const next = new Map();
    let lostFocus = false;

    for (const process of sorted) {
      const previous = this.rows.get(process.PID);
      const row =
        previous && sameProcess(previous.process, process)
          ? previous
          : this.makeRow(process);
      row.process = process;
      const values = [
        process.PID,
        process.USER,
        process.COMMAND,
        process["%CPU"],
        process["%MEM"],
      ];
      values.forEach((value, index) => {
        const text = String(value ?? "–");
        if (row.cells[index].textContent !== text)
          row.cells[index].textContent = text;
      });
      next.set(process.PID, row);
    }

    for (const [pid, row] of this.rows) {
      if (next.get(pid) === row) continue;
      if (this.menuRow === row) {
        lostFocus ||= this.menu.contains(document.activeElement);
        this.menu.hidePopover();
      }
      lostFocus ||= row.element.contains(document.activeElement);
      row.element.remove();
    }

    // Existing rows already appear in PID order. Insert only newly seen rows.
    let anchor = null;
    for (const row of Array.from(next.values()).reverse()) {
      if (row.element.parentElement !== this.body)
        this.body.insertBefore(row.element, anchor);
      anchor = row.element;
    }
    this.rows = next;
    if (next.size) this.empty.remove();
    else if (!this.empty.parentElement) this.body.append(this.empty);

    if (lostFocus)
      document.getElementById("md3e-workspace")?.focus({ preventScroll: true });
    if (this.menuRow) this.positionMenu();
  },

  buildMenu() {
    const actions = [
      [1, _("Hang Up")],
      [15, _("Terminate")],
      [9, _("Kill")],
    ];
    this.menu = E(
      "div",
      {
        id: "md3e-process-actions",
        class: "md3e-row-menu",
        popover: "auto",
        role: "group",
        "aria-label": _("Process actions"),
      },
      actions.map(([signal, label]) =>
        E(
          "button",
          {
            type: "button",
            class: signal === 1 ? "" : "md3e-row-menu-danger",
            click: () => this.chooseAction(signal, label),
          },
          [label],
        ),
      ),
    );

    this.menu.addEventListener("beforetoggle", (event) => {
      if (event.newState === "closed") {
        this.menuRow?.trigger.setAttribute("aria-expanded", "false");
        this.menuRow = null;
      }
    });
    this.menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const trigger = this.menuRow?.trigger;
      this.menu.hidePopover();
      trigger?.focus({ preventScroll: true });
    });
    window.addEventListener("scroll", () => this.positionMenu(), {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", () => this.positionMenu());
    document.addEventListener("focusin", (event) => {
      if (
        this.menuRow &&
        event.target !== this.menuRow.trigger &&
        !this.menu.contains(event.target)
      ) {
        this.menu.hidePopover();
      }
    });
  },

  openMenu(row) {
    if (this.busy) return;
    const sameRow = this.menuRow === row;
    if (this.menuRow) this.menu.hidePopover();
    if (sameRow) return;

    this.menuRow = row;
    this.menu.setAttribute(
      "aria-label",
      row.trigger.getAttribute("aria-label"),
    );
    this.menu.showPopover({ source: row.trigger });
    row.trigger.setAttribute("aria-expanded", "true");
    this.positionMenu();
    this.menu.firstElementChild.focus({ preventScroll: true });
  },

  positionMenu() {
    if (!this.menuRow) return;
    const anchor = this.menuRow.trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = this.menu;
    const gap = 8;
    const preferredLeft = anchor.right - width >= gap ? anchor.right - width : anchor.left;
    const left = Math.max(
      gap,
      Math.min(preferredLeft, innerWidth - width - gap),
    );
    const above = anchor.bottom + height + gap * 2 > innerHeight;
    const top = above
      ? Math.max(gap, anchor.top - height - gap)
      : anchor.bottom + gap;
    Object.assign(this.menu.style, {
      left: left + "px",
      top: top + "px",
      right: "auto",
      bottom: "auto",
    });
  },

  chooseAction(signal, label) {
    const row = this.menuRow;
    if (!row || this.busy) return;
    this.menu.hidePopover();
    row.trigger.focus({ preventScroll: true });
    const target = row.process;
    if (signal === 1) {
      this.sendSignal(signal, target);
      return;
    }

    const close = () => {
      dialog.removeAttribute("aria-labelledby");
      ui.hideModal();
    };
    const cancel = E("button", { type: "button", class: "btn", click: close }, [
      _("Cancel"),
    ]);
    const dialog = ui.showModal(
      _("%s process %s?").format(label, target.PID),
      [
        E("p", {}, [_("This sends a signal to the following process:")]),
        E("code", {}, [target.COMMAND || _("Unknown command")]),
        E("div", { class: "button-row" }, [
          cancel,
          E(
            "button",
            {
              type: "button",
              class: "btn cbi-button cbi-button-negative important",
              click: () => {
                close();
                this.sendSignal(signal, target);
              },
            },
            [label],
          ),
        ]),
      ],
      "md3e-danger-confirm",
    );
    dialog.firstElementChild.id = "md3e-danger-confirm-title";
    dialog.setAttribute("aria-labelledby", "md3e-danger-confirm-title");
    cancel.focus({ preventScroll: true });
  },

  async sendSignal(signal, target) {
    if (this.busy || L.hasViewPermission() === false) return;
    this.busy = true;
    this.body.setAttribute("aria-busy", "true");
    this.signalGeneration++;
    this.feedback.textContent = _("Checking process %s…").format(target.PID);
    try {
      const processes = await processesView.load();
      if (!processes.some((process) => sameProcess(process, target))) {
        this.feedback.textContent = _(
          "Process %s is no longer available.",
        ).format(target.PID);
        this.updateRows(processes);
        return;
      }
      const result = await fs.exec("/bin/kill", [
        "-" + signal,
        String(target.PID),
      ]);
      if (result.code !== 0)
        throw new Error(result.stderr?.trim() || _("Command failed"));
      try {
        this.updateRows(await processesView.load());
      } catch {
        this.refreshError.textContent = _(
          "Could not refresh the process list.",
        );
      }
      this.feedback.textContent = _("Signal sent to process %s.").format(
        target.PID,
      );
    } catch (error) {
      this.feedback.textContent = _("Could not signal process %s: %s").format(
        target.PID,
        error.message,
      );
    } finally {
      this.busy = false;
      this.body.removeAttribute("aria-busy");
    }
  },
});
