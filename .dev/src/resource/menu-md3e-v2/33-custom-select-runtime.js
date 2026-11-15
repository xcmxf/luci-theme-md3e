  initCustomSelects() {
    if (this._customSelectsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target.querySelector("select, .cbi-dropdown")) {
      this.watchForAddedElement(
        "_customSelectBootstrapObserver",
        target,
        "select, .cbi-dropdown",
        () => this.initCustomSelects(),
      );
      return;
    }

    this._customSelectsInitialized = true;
    this._openOutlineSelects = this._openOutlineSelects || new Set();
    this._openCbiDropdowns = this._openCbiDropdowns || new Set();
    this._activeOutlineSelect = this._activeOutlineSelect || null;
    this._activeCbiDropdown = this._activeCbiDropdown || null;

    const replaceAll = (scope = target) => {
      this.forEachElementMatch(scope, "select", (select) =>
        this.replaceSelect(select),
      );
    };

    replaceAll(target);
    target
      .querySelectorAll?.(".cbi-dropdown[open]")
      .forEach((dropdown) => this.syncCbiDropdownPanel(dropdown));

    if (!this._customSelectClickHandler) {
      this._customSelectClickHandler = (event) => {
        const activeOutline = this._activeOutlineSelect;
        if (activeOutline && !activeOutline.isConnected) {
          this._openOutlineSelects.delete(activeOutline);
          this._activeOutlineSelect = null;
          this._syncDropdownViewportListeners?.();
        } else if (activeOutline && !activeOutline.contains(event.target)) {
          activeOutline._md3eCloseOutlineSelect?.();
        }

        const openButton = event.target.closest(".cbi-dropdown > .open");
        if (!openButton) return;

        const dropdown = openButton.closest(".cbi-dropdown");
        if (!dropdown) return;
        this.closeAllDropdowns(dropdown);
        this._activeCbiDropdown = dropdown;
        this.scheduleFrame("_customSelectClickFrame", () =>
          this.syncCbiDropdownPanel(dropdown),
        );
      };
      document.addEventListener("click", this._customSelectClickHandler);
    }

    this.observeCustomSelectMutations(target);
    this.initSelectViewportListeners();
  },

  observeCustomSelectMutations(target) {
    this.observeDomMutations(
      target,
      "custom-selects",
      (mutations) => {
        const dropdowns = new Set();
        const addedSelects = new Set();
        let removedOutlineSelect = false;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              this.forEachElementMatch(node, "select", (select) => {
                addedSelects.add(select);
              });
            });
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType !== 1) return;
              removedOutlineSelect =
                removedOutlineSelect ||
                node.matches?.(".outline-select") ||
                node.querySelector?.(".outline-select");
              this.forEachElementMatch(node, "select", (select) =>
                this.cleanupSelect(select),
              );
            });
            return;
          }

          if (
            mutation.type === "attributes" &&
            mutation.target instanceof HTMLElement &&
            mutation.target.matches(".cbi-dropdown")
          ) {
            dropdowns.add(mutation.target);
          }
        });

        if (addedSelects.size) {
          this.scheduleFrame("_customSelectAddedFrame", () => {
            addedSelects.forEach((select) => {
              if (select.isConnected) this.replaceSelect(select);
            });
          });
        }

          if (removedOutlineSelect) {
            this._openOutlineSelects.forEach((wrap) => {
              if (!wrap.isConnected) this._openOutlineSelects.delete(wrap);
            });
          if (
            this._activeOutlineSelect &&
            !this._activeOutlineSelect.isConnected
          ) {
            this._activeOutlineSelect = null;
          }
          this._syncDropdownViewportListeners?.();
        }

        if (!dropdowns.size) return;

        this.scheduleFrame("_customSelectDropdownFrame", () => {
          dropdowns.forEach((dropdown) => this.syncCbiDropdownPanel(dropdown));
        });
      },
      {
        childList: true,
        attributes: true,
        attributeFilter: ["open"],
        subtree: true,
      },
    );
  },

  initSelectViewportListeners() {
    const syncViewportListeners = () => {
      const hasOpen =
        Array.from(this._openOutlineSelects || []).some((wrap) => wrap.isConnected) ||
        Array.from(this._openCbiDropdowns || []).some(
          (dropdown) => dropdown.isConnected && dropdown.hasAttribute("open"),
        );

      if (hasOpen === this._dropdownViewportListening) return;
      this._dropdownViewportListening = hasOpen;

      const method = hasOpen ? "addEventListener" : "removeEventListener";
      window[method]("resize", this._dropdownViewportHandler);
      window[method]("scroll", this._dropdownViewportHandler, true);
    };

    if (!this._dropdownViewportHandler) {
      this._dropdownViewportHandler = () => {
        this.scheduleFrame("_customSelectViewportFrame", () => {
          const openSelects = Array.from(this._openOutlineSelects || []).filter(
            (wrap) => wrap.isConnected,
          );
          const openDropdowns = Array.from(this._openCbiDropdowns || []).filter(
            (dropdown) => dropdown.isConnected && dropdown.hasAttribute("open"),
          );
          if (!openSelects.length && !openDropdowns.length) return;

          openSelects.forEach((wrap) => {
            this.positionSelectPanel(
              wrap,
              wrap.querySelector(":scope > .outline-select-panel"),
            );
          });
          openDropdowns.forEach((dropdown) => this.syncCbiDropdownPanel(dropdown));
        });
      };
    }

    this._syncDropdownViewportListeners = syncViewportListeners;
    syncViewportListeners();
  },
