  initMobileActionGroups() {
    const target = document.getElementById("maincontent") || document.body;
    const actionCache = new WeakMap();

    const syncDirtyClass = () => {
      const anyDirty = target.querySelector(`${PAGE_ACTIONS_SELECTOR}[data-dirty='true']`);
      document.body.classList.toggle("mobile-page-actions-visible", Boolean(anyDirty));
    };

    const setDirty = (actions, dirty) => {
      if (!actions.length) return;
      actions.forEach((action) => {
        action.dataset.dirty = dirty ? "true" : "false";
      });
      syncDirtyClass();
    };

    const getActionsForElement = (el) => {
      const cachedActions = actionCache.get(el);
      if (cachedActions?.some((action) => action.isConnected)) {
        return cachedActions.filter((action) => action.isConnected);
      }

      const scopes = [
        el.closest(".cbi-section"),
        el.closest(".cbi-map"),
        el.closest("form"),
      ].filter(Boolean);

      for (const scope of scopes) {
        const actions = Array.from(scope.querySelectorAll(PAGE_ACTIONS_SELECTOR));
        if (actions.length) {
          actionCache.set(el, actions);
          return actions;
        }
      }

      const fallbackActions = Array.from(target.querySelectorAll(PAGE_ACTIONS_SELECTOR));
      actionCache.set(el, fallbackActions);
      return fallbackActions;
    };

    const isFormControl = (element) =>
      element instanceof HTMLElement && element.matches(FORM_CONTROL_SELECTOR);

    target.addEventListener("input", (event) => {
      if (isFormControl(event.target)) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("change", (event) => {
      if (isFormControl(event.target)) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("click", (event) => {
      const btn = event.target.closest(".cbi-button-reset, .cbi-button-save, .cbi-button-apply, .btn.primary");
      if (btn) {
        const actions = btn.closest(PAGE_ACTIONS_SELECTOR);
        if (actions) {
          const resetDelay = btn.matches(".cbi-button-reset") ? 40 : 160;
          setTimeout(() => setDirty([actions], false), resetDelay);
        }
      }
    }, true);

    syncDirtyClass();
  },
