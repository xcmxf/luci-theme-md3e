  positionSelectPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }

    this.scheduleElementFrame(panel, "_md3ePositionFrame", () => {
      this.positionDropdownPanel(anchor, panel);
      panel
        .querySelector(":scope > .outline-select-option.selected")
        ?.scrollIntoView({ block: "nearest" });
    });
  },

  syncCbiDropdownPanel(dropdown) {
    if (!(dropdown instanceof HTMLElement)) return;
    const panel = this.getCbiDropdownPanel(dropdown);
    if (!(panel instanceof HTMLElement)) return;

    if (dropdown.hasAttribute("open")) {
      this._openCbiDropdowns.add(dropdown);
      this._activeCbiDropdown = dropdown;
      this.positionSelectPanel(dropdown, panel);
    } else {
      this._openCbiDropdowns.delete(dropdown);
      if (this._activeCbiDropdown === dropdown) this._activeCbiDropdown = null;
      this.resetDropdownPanel(panel);
    }
    this._syncDropdownViewportListeners?.();
  },

  cleanupSelect(select) {
    select?._md3eOptionObserver?.disconnect();
    if (select) select._md3eOptionObserver = null;
  },

  replaceSelect(sel) {
    if (!(sel instanceof HTMLSelectElement) || sel.closest("#content_syslog")) return;
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) return;
    // Preserve native grouping and validation where the proxy cannot reproduce them.
    if (sel.multiple || sel.size > 1 || sel.required || sel.querySelector("optgroup")) {
      return;
    }
    if (sel._outlineReplaced || sel.closest(".outline-select")) return;

    if (!sel.options.length) return;
    sel._outlineReplaced = true;

    const wrap = document.createElement("div");
    wrap.className = "outline-select";
    wrap.setAttribute("role", "combobox");
    wrap.setAttribute("aria-haspopup", "listbox");
    wrap.setAttribute("aria-expanded", "false");
    const selectId = (this._md3eSelectId || 0) + 1;
    this._md3eSelectId = selectId;
    const labelledBy = sel.getAttribute("aria-labelledby");
    const ariaLabel = sel.getAttribute("aria-label");
    const labels = Array.from(sel.labels ?? []);
    if (labelledBy) {
      wrap.setAttribute("aria-labelledby", labelledBy);
    } else if (ariaLabel) {
      wrap.setAttribute("aria-label", ariaLabel);
    } else if (labels.length) {
      const ids = labels.map((label, index) => {
        if (!label.id) label.id = "md3e-select-label-" + selectId + "-" + index;
        return label.id;
      });
      wrap.setAttribute("aria-labelledby", ids.join(" "));
    }

    const trigger = document.createElement("div");
    trigger.className = "outline-select-trigger";

    const value = document.createElement("span");
    value.className = "outline-select-value";
    value.textContent = sel.options[sel.selectedIndex]?.text || "";

    const chevron = document.createElement("span");
    chevron.className = "outline-select-chevron";
    trigger.append(value, chevron);

    const panel = document.createElement("div");
    panel.className = "outline-select-panel";
    panel.id = "md3e-select-options-" + selectId;
    panel.setAttribute("role", "listbox");
    wrap.setAttribute("aria-controls", panel.id);
    for (const name of ["aria-label", "aria-labelledby"]) {
      const label = wrap.getAttribute(name);
      if (label) panel.setAttribute(name, label);
    }

    const close = () => {
      if (!wrap.classList.contains("open")) return;
      this._openOutlineSelects.delete(wrap);
      if (this._activeOutlineSelect === wrap) this._activeOutlineSelect = null;
      this.resetDropdownPanel(panel);
      wrap.classList.remove("open");
      wrap.setAttribute("aria-expanded", "false");
      this._syncDropdownViewportListeners?.();
    };

    const isDisabled = () => sel.matches(":disabled");
    const syncDisabledState = () => {
      const disabled = isDisabled();
      wrap.tabIndex = disabled ? -1 : 0;
      wrap.classList.toggle("disabled", disabled);
      wrap.setAttribute("aria-disabled", String(disabled));
      if (disabled) close();
    };
    const syncSelection = () => {
      value.textContent = sel.options[sel.selectedIndex]?.text || "";
      for (const item of panel.children) {
        const selected = Number(item.dataset.index) === sel.selectedIndex;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-selected", String(selected));
      }
    };

    const buildOptions = () => {
      panel.textContent = "";
      Array.from(sel.options).forEach((opt) => {
        if (opt.hidden) return;
        const item = document.createElement("div");
        item.className = "outline-select-option";
        item.setAttribute("role", "option");
        if (opt.matches(":disabled")) item.setAttribute("aria-disabled", "true");
        item.dataset.value = opt.value;
        item.dataset.index = opt.index;
        item.textContent = opt.text;
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          if (isDisabled() || opt.matches(":disabled")) return;
          close();
          if (sel.selectedIndex === opt.index) return;
          sel.selectedIndex = opt.index;
          sel.dispatchEvent(new Event("input", { bubbles: true }));
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        });
        panel.appendChild(item);
      });
      syncSelection();
    };

    const open = () => {
      if (wrap.classList.contains("open") || isDisabled()) return;
      this.closeAllDropdowns(wrap);
      this._openOutlineSelects.add(wrap);
      this._activeOutlineSelect = wrap;
      wrap.classList.add("open");
      wrap.setAttribute("aria-expanded", "true");
      this.positionSelectPanel(wrap, panel);
      this._syncDropdownViewportListeners?.();
    };

    buildOptions();
    wrap.append(trigger, panel);
    sel.style.display = "none";
    sel.insertAdjacentElement("afterend", wrap);
    wrap._md3eCloseOutlineSelect = close;
    syncDisabledState();
    sel.addEventListener("change", syncSelection);
    sel.addEventListener("click", () => {
      if (!isDisabled()) wrap.focus();
    });

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      wrap.classList.contains("open") ? close() : open();
    });

    wrap.addEventListener("keydown", (event) => {
      if (isDisabled()) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        wrap.classList.contains("open") ? close() : open();
        return;
      }

      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      const options = [...panel.querySelectorAll('.outline-select-option:not([aria-disabled="true"])')];
      const currentIndex = sel.selectedIndex;
      const next = event.key === "ArrowDown"
        ? options.find((option) => Number(option.dataset.index) > currentIndex)
        : options.reverse().find((option) => Number(option.dataset.index) < currentIndex);
      next?.click();
    });

    const optionObserver = new MutationObserver(() => {
      if (!sel.isConnected || !wrap.isConnected) {
        this.cleanupSelect(sel);
        this._openOutlineSelects.delete(wrap);
        if (this._activeOutlineSelect === wrap) this._activeOutlineSelect = null;
        this._syncDropdownViewportListeners?.();
        return;
      }

      syncDisabledState();
      buildOptions();
    });
    sel._md3eOptionObserver = optionObserver;
    optionObserver.observe(sel, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  },
