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
    if (!(sel instanceof HTMLSelectElement)) return;
    if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) return;
    if (sel.multiple || sel.size > 1) return;
    if (sel._outlineReplaced || sel.closest(".outline-select")) return;

    const opts = Array.from(sel.options);
    if (!opts.length) return;
    sel._outlineReplaced = true;

    const wrap = document.createElement("div");
    wrap.className = "outline-select";
    wrap.tabIndex = 0;
    if (sel.disabled) wrap.classList.add("disabled");

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

    const close = () => {
      if (!wrap.classList.contains("open")) return;
      this._openOutlineSelects.delete(wrap);
      if (this._activeOutlineSelect === wrap) this._activeOutlineSelect = null;
      this.resetDropdownPanel(panel);
      wrap.classList.remove("open");
      this._syncDropdownViewportListeners?.();
    };

    const buildOptions = () => {
      panel.textContent = "";
      Array.from(sel.options).forEach((opt) => {
        const item = document.createElement("div");
        item.className =
          "outline-select-option" +
          (opt.index === sel.selectedIndex ? " selected" : "");
        item.dataset.value = opt.value;
        item.dataset.index = opt.index;
        item.textContent = opt.text;
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          sel.selectedIndex = opt.index;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          value.textContent = opt.text;
          panel
            .querySelectorAll(".selected")
            .forEach((option) => option.classList.remove("selected"));
          item.classList.add("selected");
          close();
        });
        panel.appendChild(item);
      });
    };

    const open = () => {
      if (wrap.classList.contains("open") || sel.disabled) return;
      this.closeAllDropdowns(wrap);
      this._openOutlineSelects.add(wrap);
      this._activeOutlineSelect = wrap;
      wrap.classList.add("open");
      this.positionSelectPanel(wrap, panel);
      this._syncDropdownViewportListeners?.();
    };

    buildOptions();
    wrap.append(trigger, panel);
    sel.style.display = "none";
    sel.insertAdjacentElement("afterend", wrap);
    wrap._md3eCloseOutlineSelect = close;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      wrap.classList.contains("open") ? close() : open();
    });

    wrap.addEventListener("keydown", (event) => {
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
      const items = Array.from(panel.querySelectorAll(".outline-select-option"));
      const current = panel.querySelector(".outline-select-option.selected");
      const index = items.indexOf(current);
      const next =
        event.key === "ArrowDown"
          ? Math.min(index + 1, items.length - 1)
          : Math.max(index - 1, 0);
      items[next]?.click();
    });

    const optionObserver = new MutationObserver(() => {
      if (!sel.isConnected || !wrap.isConnected) {
        this.cleanupSelect(sel);
        this._openOutlineSelects.delete(wrap);
        if (this._activeOutlineSelect === wrap) this._activeOutlineSelect = null;
        this._syncDropdownViewportListeners?.();
        return;
      }

      value.textContent = sel.options[sel.selectedIndex]?.text || "";
      buildOptions();
    });
    sel._md3eOptionObserver = optionObserver;
    optionObserver.observe(sel, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  },
