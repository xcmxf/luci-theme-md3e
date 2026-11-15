  getCbiDropdownPanel(dropdown) {
    if (!(dropdown instanceof HTMLElement)) return null;
    return (
      dropdown.querySelector(":scope > ul.dropdown") ||
      dropdown.querySelector(":scope > ul:not(.preview)")
    );
  },

  syncSplitButtonLabel(splitButton) {
    if (!(splitButton instanceof HTMLElement)) return;
    const menu = this.getCbiDropdownPanel(splitButton);
    if (!(menu instanceof HTMLElement)) return;

    const current =
      menu.querySelector(":scope > li[display]") ||
      menu.querySelector(":scope > li[selected]") ||
      menu.querySelector(":scope > li");
    const label = current?.textContent?.trim() || _("Save & Apply");

    splitButton.dataset.md3eSplitLabel = label;
    splitButton.setAttribute("aria-label", label);

    let labelNode = splitButton.querySelector(":scope > .md3e-split-button__label");
    if (!(labelNode instanceof HTMLElement)) {
      labelNode = document.createElement("span");
      labelNode.className = "md3e-split-button__label";
      labelNode.setAttribute("aria-hidden", "true");
      splitButton.insertBefore(labelNode, splitButton.firstElementChild);
    }
    labelNode.textContent = label;

    const more = splitButton.querySelector(":scope > .more");
    if (more instanceof HTMLElement) {
      more.textContent = "";
      more.setAttribute("aria-hidden", "true");
    }

    splitButton.querySelectorAll(":scope > ul.preview").forEach((preview) => {
      preview.hidden = true;
      preview.setAttribute("aria-hidden", "true");
    });

    const toggle = splitButton.querySelector(":scope > .open");
    if (toggle instanceof HTMLElement) {
      toggle.textContent = "";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("aria-label", _("Show more apply options"));
    }
  },

  initSplitButton(splitButton) {
    if (!(splitButton instanceof HTMLElement)) return;
    if (this.initApplySplitButton(splitButton)) return;

    splitButton.classList.add("md3e-split-button");
    splitButton.dataset.md3eSplitButton = "true";
    this.syncSplitButtonLabel(splitButton);

    if (splitButton.dataset.md3eSplitButtonInit === "true") return;
    splitButton.dataset.md3eSplitButtonInit = "true";

    const menu = this.getCbiDropdownPanel(splitButton);
    if (menu instanceof HTMLElement) {
      new MutationObserver(() => this.syncSplitButtonLabel(splitButton)).observe(
        menu,
        {
          attributes: true,
          childList: true,
          subtree: true,
        },
      );
    }
  },

  closeAllDropdowns(except) {
    // Close all outline-selects
    const outlineSelects = new Set([
      ...(this._openOutlineSelects || []),
      ...document.querySelectorAll(".outline-select.open"),
    ]);
    outlineSelects.forEach((s) => {
      if (!s.isConnected) {
        this._openOutlineSelects?.delete(s);
        if (this._activeOutlineSelect === s) this._activeOutlineSelect = null;
        return;
      }
      if (s === except) return;
      if (s._md3eCloseOutlineSelect) {
        s._md3eCloseOutlineSelect();
        return;
      }
      this.resetDropdownPanel(s.querySelector(":scope > .outline-select-panel"));
      s.classList.remove("open");
    });
    // Close all cbi-dropdowns
    const cbiDropdowns = new Set([
      ...(this._openCbiDropdowns || []),
      ...document.querySelectorAll(".cbi-dropdown[open]"),
    ]);
    cbiDropdowns.forEach((d) => {
      if (!d.isConnected) {
        this._openCbiDropdowns?.delete(d);
        if (this._activeCbiDropdown === d) this._activeCbiDropdown = null;
        return;
      }
      if (d === except) return;
      const panel = this.getCbiDropdownPanel(d);
      d.dispatchEvent(new CustomEvent("cbi-dropdown-close", {}));
      this.resetDropdownPanel(panel);
    });
  },
