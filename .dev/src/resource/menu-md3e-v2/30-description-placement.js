  initDescriptionPlacement() {
    const setValueClass = (element, className, enabled) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.classList.contains(className) === enabled) return;

      element._md3eVcw = (element._md3eVcw || 0) + 1;
      element.classList.toggle(className, enabled);
    };

    const syncValueState = (row) => {
      if (!(row instanceof HTMLElement) || !row.classList.contains("cbi-value")) {
        return;
      }

      const field = row.querySelector(":scope > .cbi-value-field");
      const hasOpenDropdown = Boolean(
        row.querySelector(".cbi-dropdown[open], .outline-select.open"),
      );
      const hasProgress = Boolean(
        row.querySelector(".cbi-progressbar, .progress"),
      );
      const hasTextarea = Boolean(field?.querySelector("textarea"));
      const hasControl = Boolean(
        field?.querySelector(":scope > :is(input, select, textarea, .cbi-dropdown, .control-group)"),
      );
      const hasDisabledDropdown = Boolean(
        field?.querySelector(":scope > .cbi-dropdown[disabled]"),
      );
      const hasLocalTime = Boolean(field?.querySelector("#localtime"));
      const hasStandardLayout = Boolean(
        row.querySelector(":scope > .cbi-value-title") ||
          row.querySelector(":scope > .cbi-value-field"),
      );
      const hasPortDropdown = Boolean(
        field?.querySelector(":scope > .cbi-dropdown:not(.btn):not(.cbi-button)"),
      );
      const hasRichContent = Boolean(
        row.querySelector(
          ".cbi-value-description, textarea, select, .cbi-dropdown, .outline-select, .cbi-button",
        ),
      );

      setValueClass(row, "md3e-value-dropdown-open", hasOpenDropdown);
      setValueClass(row, "md3e-value-rich-content", hasRichContent);
      setValueClass(row, "md3e-value-has-progress", hasProgress);
      setValueClass(field, "md3e-value-field-dropdown-open", hasOpenDropdown);
      setValueClass(field, "md3e-value-field-progress", hasProgress);
      setValueClass(row, "md3e-value-progress", hasProgress);
      setValueClass(row, "md3e-value-custom-mount", !hasStandardLayout);
      setValueClass(row, "md3e-value-port-dropdown", hasPortDropdown);
      setValueClass(field, "md3e-value-field-textarea", hasTextarea);
      setValueClass(field, "md3e-value-field-control", hasControl);
      setValueClass(field, "md3e-value-field-disabled-dropdown", hasDisabledDropdown);
      setValueClass(field, "md3e-value-field-localtime", hasLocalTime);
    };

    const syncValueStates = (scope = document) => {
      if (scope instanceof HTMLElement) {
        if (scope.matches(".cbi-value")) syncValueState(scope);
        scope.querySelectorAll?.(".cbi-value").forEach(syncValueState);
      } else {
        document.querySelectorAll(".cbi-value").forEach(syncValueState);
      }
    };

    const move = (scope = document) => {
      const descriptions = [];

      if (
        scope instanceof HTMLElement &&
        scope.matches(".cbi-value-field > .cbi-value-description")
      ) {
        descriptions.push(scope);
      }

      scope
        .querySelectorAll(".cbi-value-field > .cbi-value-description")
        ?.forEach((desc) => descriptions.push(desc));

      descriptions.forEach((desc) => {
        if (desc._aurMoved) return;
        desc._aurMoved = true;
        const row = desc.closest(".cbi-value");
        if (!row) return;
        const title = row.querySelector(".cbi-value-title");
        if (title) {
          title.appendChild(desc);
        }
      });

      syncValueStates(scope);
    };

    move();

    const target = document.getElementById("maincontent") || document.body;
    const pendingScopes = new Set();
    this.observeDomMutations(target, "description-placement", (mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          mutation.target instanceof HTMLElement &&
          mutation.target._md3eVcw
        ) {
          mutation.target._md3eVcw -= 1;
          return;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement
        ) {
          const row = mutation.target.closest(".cbi-value");
          if (row) pendingScopes.add(row);
          return;
        }

        if (
          mutation.type === "childList" &&
          mutation.target instanceof HTMLElement
        ) {
          const row = mutation.target.closest(".cbi-value");
          if (row) pendingScopes.add(row);
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) pendingScopes.add(node);
        });
      });

      if (!pendingScopes.size) return;

      this.scheduleFrame("_descriptionPlacementFrame", () => {
        pendingScopes.forEach((scope) => move(scope));
        pendingScopes.clear();
      });
    }, {
      childList: true,
      attributes: true,
      attributeFilter: ["open", "class", "disabled"],
      subtree: true,
    });
  },
