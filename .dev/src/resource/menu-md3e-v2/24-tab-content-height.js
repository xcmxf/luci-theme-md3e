  initTabContentHeightAnimation(target) {
    if (!target) return;

    const shouldAnimateHeight = () =>
      !this.isMobileViewport() &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const maxAnimatedHeight = 720;
    const maxAnimatedDelta = 360;
    const syncTabPanelState = (scope = target) => {
      this.forEachElementMatch(scope, TAB_PANEL_SELECTOR, (panel) => {
        const active = panel.getAttribute("data-tab-active") === "true";
        panel.classList.toggle("md3e-tab-panel-active", active);
        panel.classList.toggle("md3e-tab-panel-hidden", !active);
      });
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el._htLock) continue;

        const newH = Math.round(entry.borderBoxSize[0].blockSize);
        const oldH = el._htPrev;
        el._htPrev = newH;

        if (oldH === undefined || oldH === newH) continue;
        if (
          !shouldAnimateHeight() ||
          oldH < 24 ||
          newH < 24 ||
          Math.max(oldH, newH) > maxAnimatedHeight ||
          Math.abs(newH - oldH) > maxAnimatedDelta
        ) {
          continue;
        }

        el._htLock = true;
        el.classList.add("tab-height-anim");
        el.style.height = oldH + "px";
        this.scheduleElementFrame(el, "_md3eHeightWriteFrame", () => {
          const targetH = Math.max(newH, el.scrollHeight || 0);
          el.style.height = targetH + "px";
        });

        const done = () => {
          el.classList.remove("tab-height-anim");
          el.style.height = "";
          el._htLock = false;
        };

        const onEnd = (e) => {
          if (e.propertyName !== "height") return;
          el.removeEventListener("transitionend", onEnd);
          clearTimeout(tid);
          done();
        };

        el.addEventListener("transitionend", onEnd);
        const tid = setTimeout(() => {
          el.removeEventListener("transitionend", onEnd);
          done();
        }, 500);
      }
    });

    const watch = (c) => {
      if (c._htWatched) return;
      c._htWatched = true;
      ro.observe(c);
    };
    this.watchTabContentHeight = watch;

    this.forEachElementMatch(
      target,
      TAB_CONTAINER_SELECTOR,
      watch,
    );
  },
