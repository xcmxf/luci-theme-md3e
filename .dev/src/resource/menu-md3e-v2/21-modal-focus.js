  initModalFocus(overlay, modalIsOpen) {
    let lastControl = null;
    const focusableSelector =
      "a[href], button, input, select, textarea, [tabindex]";

    const rememberControl = (event) => {
      if (modalIsOpen()) return;
      const control = event.target.closest?.(focusableSelector);
      if (control?.getClientRects().length) lastControl = control;
    };
    // LuCI disables the triggering button while loading a form, which blurs it.
    document.addEventListener("focusin", rememberControl);
    document.addEventListener("click", rememberControl, true);

    overlay?.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const dialog = overlay.firstElementChild;
      if (!dialog || !modalIsOpen()) return;

      const tabbable = Array.from(dialog.querySelectorAll(focusableSelector))
        .filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            !element.closest("[inert]") &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility === "visible",
        )
        .sort(
          (a, b) =>
            (a.tabIndex || Number.MAX_SAFE_INTEGER) -
            (b.tabIndex || Number.MAX_SAFE_INTEGER),
        );
      const first = tabbable[0];
      const last = tabbable.at(-1);
      const fromDialog = event.target === dialog || event.target === overlay;
      const boundary = event.shiftKey ? first : last;
      if (!first || fromDialog || event.target === boundary) {
        event.preventDefault();
        const next = (event.shiftKey ? last : first) || dialog;
        next.focus();
      }
    });

    return () =>
      lastControl?.isConnected ? lastControl : document.activeElement;
  },
