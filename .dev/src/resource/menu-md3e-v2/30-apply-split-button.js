  initApplySplitButton(original) {
    if (!original.matches(".cbi-button-apply.important")) return false;
    const widget = L.dom.findClassInstance(original);
    if (!ui.ComboButton || !(widget instanceof ui.ComboButton) || typeof widget.options.click !== "function") {
      return false;
    }

    const choices = Array.from(
      original.querySelectorAll(":scope > ul > li[data-value]:not([unselectable])"),
    );
    const defaultChoice = choices.find((choice) => choice.dataset.value === "0");
    const alternatives = choices.filter((choice) => choice !== defaultChoice);
    if (!defaultChoice || !alternatives.length) return false;

    const menuId = `md3e-apply-menu-${original.dataset.idref}`;
    const label = defaultChoice.textContent.trim();
    const primary = E("button", {
      type: "button",
      class: "md3e-apply-primary cbi-button-apply",
    }, label);
    const toggle = E("button", {
      type: "button",
      class: "md3e-apply-toggle",
      "aria-label": _("Show more apply options"),
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-controls": menuId,
    });
    const options = alternatives.map((choice) => E("button", {
      type: "button",
      role: "menuitem",
      tabindex: "-1",
      class: "cbi-button-apply",
    }, choice.textContent.trim()));
    const menu = E("div", {
      id: menuId,
      class: "md3e-apply-menu",
      role: "menu",
      "aria-label": toggle.getAttribute("aria-label"),
      hidden: "",
    }, options);
    const group = E("fieldset", {
      class: "md3e-apply-split",
      "aria-label": label,
    }, [primary, toggle, menu]);

    const close = () => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    };
    const open = (item = options[0]) => {
      if (group.disabled) return;
      this.closeAllDropdowns();
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      this.positionDropdownPanel(group, menu);
      item.focus({ preventScroll: true });
    };
    const actionButtons = [primary, ...options];
    let runningButton = null;
    const syncDisabled = () => {
      const busy = actionButtons.some((button) => button.disabled);
      const disabled = busy || original.hasAttribute("disabled");
      if (group.disabled !== disabled) group.disabled = disabled;
      if (disabled) close();
      if (!busy && runningButton) {
        if (!disabled && document.activeElement === document.body) {
          runningButton.focus({ preventScroll: true });
        }
        runningButton = null;
      }
    };
    const bindAction = (button, choice) => {
      button.addEventListener("click", (event) => {
        if (group.disabled || actionButtons.some((action) => action.disabled)) return;
        runningButton = button === primary ? primary : toggle;
        close();
        widget.options.click.call(original, event, choice.dataset.value);
        syncDisabled();
      });
    };
    bindAction(primary, defaultChoice);
    options.forEach((button, index) => bindAction(button, alternatives[index]));

    toggle.addEventListener("click", () => {
      if (menu.hidden) open();
      else {
        close();
        toggle.focus();
      }
    });
    toggle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      open(event.key === "ArrowUp" ? options.at(-1) : options[0]);
    });
    menu.addEventListener("keydown", (event) => {
      const index = options.indexOf(document.activeElement);
      switch (event.key) {
        case "Escape":
          event.stopPropagation();
          event.preventDefault();
          close();
          toggle.focus();
          break;
        case "Tab":
          close();
          toggle.focus();
          break;
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault();
          const offset = event.key === "ArrowDown" ? 1 : -1;
          options[(index + offset + options.length) % options.length].focus();
          break;
        }
        case "Home":
        case "End":
          event.preventDefault();
          (event.key === "Home" ? options[0] : options.at(-1)).focus();
          break;
      }
    });
    group.addEventListener("focusout", (event) => {
      if (!group.contains(event.relatedTarget)) close();
    });

    original.replaceWith(group);
    original.hidden = true;
    group.appendChild(original);
    this.observeDomMutations(group, "apply-split-disabled", syncDisabled, {
      attributes: true,
      attributeFilter: ["disabled"],
      subtree: true,
    });
    syncDisabled();
    return true;
  },
