  initActionButtonGroups() {
    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

    const enhance = (actions) => {
      if (!(actions instanceof HTMLElement)) return;
      if (actions.dataset.md3eActionGroupInit === "true") return;
      actions.dataset.md3eActionGroupInit = "true";

      const directChildren = Array.from(actions.children).filter(
        (child) => child instanceof HTMLElement,
      );
      const splitButton = directChildren.find((child) =>
        child.matches(".cbi-dropdown"),
      );
      actions.classList.toggle("md3e-has-split-button", Boolean(splitButton));

      if (splitButton) {
        this.initSplitButton(splitButton);
      }

      const secondaryButtons = directChildren.filter(
        (child) =>
          child !== splitButton &&
          child.matches("button, .btn, .cbi-button, a.btn, input.btn"),
      );

      if (!secondaryButtons.length) return;

      let group = actions.querySelector(":scope > .md3e-action-group");
      if (!(group instanceof HTMLElement)) {
        group = document.createElement("div");
        group.className = "md3e-action-group";
        actions.insertBefore(group, secondaryButtons[0]);
      }

      secondaryButtons.forEach((button) => {
        group.appendChild(button);
      });
    };

    target.querySelectorAll(PAGE_ACTIONS_SELECTOR).forEach(enhance);
    this.markRowActionCells(target);

    this.observeDomMutations(target, "action-button-groups", (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(PAGE_ACTIONS_SELECTOR)) enhance(node);
          node.querySelectorAll?.(PAGE_ACTIONS_SELECTOR).forEach(enhance);
          this.markRowActionCells(node);
        }
      }
    }, {
      childList: true,
      subtree: true,
    });
  },
