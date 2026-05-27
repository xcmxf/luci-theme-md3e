  initTabContentAnimation() {
    const target = document.getElementById("maincontent") || document.body;
    if (this._tabContentAnimationInitialized) return;

    if (
      !target.querySelector(
        `.cbi-tabmenu, ${TAB_CONTAINER_SELECTOR}`,
      )
    ) {
      this.watchForAddedElement(
        "_tabContentBootstrapObserver",
        target,
        `.cbi-tabmenu, ${TAB_CONTAINER_SELECTOR}`,
        () => this.initTabContentAnimation(),
      );
      return;
    }

    this._tabContentAnimationInitialized = true;
    let animating = false;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;

    /* ── Content blur animation (fade in / out) ── */

    target.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest(".cbi-tabmenu li a");
        if (!link || animating || e._tabAnimBypass) return;
        if (reduceMotion || this.isMobileViewport()) return;

        const clickedLi = link.closest("li");
        if (clickedLi?.classList.contains("cbi-tab")) return;

        const tabMenu = link.closest(".cbi-tabmenu");
        const section = tabMenu?.closest(".cbi-section, .cbi-map");
        const activePanel = section?.querySelector(
          "[data-tab-active='true'][data-tab-title]",
        );

        if (!activePanel) return;

        e.stopPropagation();
        e.preventDefault();
        animating = true;

        activePanel.classList.add("tab-content-exit");
        activePanel.addEventListener(
          "animationend",
          () => {
            activePanel.classList.remove("tab-content-exit");
            animating = false;

            const bypass = new MouseEvent("click", { bubbles: true });
            bypass._tabAnimBypass = true;
            link.dispatchEvent(bypass);
          },
          { once: true },
        );
      },
      true,
    );

    this.initTabContentHeightAnimation(target);
    this.initTabContentViewAnimation(target);
    this.initTabContentPanelState(target);
  },
