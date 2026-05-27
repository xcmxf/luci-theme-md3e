  initTabContentPanelState(target) {
    if (!target) return;

    const syncTabPanelState = (scope = target) => {
      this.forEachElementMatch(scope, TAB_PANEL_SELECTOR, (panel) => {
        const active = panel.getAttribute("data-tab-active") === "true";
        panel.classList.toggle("md3e-tab-panel-active", active);
        panel.classList.toggle("md3e-tab-panel-hidden", !active);
      });
    };

    syncTabPanelState();

    const isTabContentMutation = (mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-tab-active"
      ) {
        return true;
      }

      if (mutation.type !== "childList") return false;

      return Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === 1 &&
          (node.id === "view" ||
            node.matches?.(TAB_CONTAINER_SELECTOR) ||
            node.querySelector?.(`${TAB_CONTAINER_SELECTOR}, #view`)),
      );
    };

    this.observeDomMutations(target, "tab-content-animation", (muts) => {
      if (!muts.some(isTabContentMutation)) return;
      this.scheduleFrame("_tabPanelStateFrame", () => syncTabPanelState());

      for (const m of muts) {
        if (
          m.type === "attributes" &&
          m.attributeName === "data-tab-active" &&
          m.target.getAttribute("data-tab-active") === "true" &&
          m.target.hasAttribute("data-tab-title")
        ) {
          this._replayTabContentAnimation?.(m.target, "tab-content-enter");
          continue;
        }

        if (m.type !== "childList") continue;

        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          this.forEachElementMatch(
            n,
            TAB_CONTAINER_SELECTOR,
            (container) => this.watchTabContentHeight?.(container),
          );
          if (n.id === "view") this._watchTabContentView?.(n);
        }
      }
    }, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tab-active"],
    });
  },
