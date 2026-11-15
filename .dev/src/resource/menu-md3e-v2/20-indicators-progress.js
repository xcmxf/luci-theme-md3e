  initUciIndicator() {
    const original = ui.changes?.setIndicator;
    if (!original || original._uciKeyboard) return;

    const selector = 'span[data-indicator="uci-changes"][data-clickable]';
    const enhanced = new WeakSet();

    const enhance = (el) => {
      if (!el) return;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-haspopup", "dialog");
      const label = (el.textContent || "").trim();
      if (label) el.setAttribute("aria-label", label);
      if (enhanced.has(el)) return;
      enhanced.add(el);
      el.addEventListener("keydown", (ev) => {
        if (ev.defaultPrevented) return;
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        if (ev.repeat) return;
        el.click();
      });
    };

    document.querySelectorAll(selector).forEach(enhance);

    const wrapped = function (n) {
      const result = original.call(this, n);
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute("data-count", n || 0);
        enhance(el);
      }
      return result;
    };
    wrapped._uciKeyboard = true;
    ui.changes.setIndicator = wrapped;
  },

  initProgressRings() {
    if (this._progressRingsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target.querySelector(".cbi-progressbar")) {
      this.watchForAddedElement(
        "_progressRingBootstrapObserver",
        target,
        ".cbi-progressbar",
        () => this.initProgressRings(),
      );
      return;
    }

    this._progressRingsInitialized = true;
    const syncBar = (bar) => {
      if (!(bar instanceof HTMLElement)) return;
      if (document.body?.dataset.page === "admin-system-package-manager") return;

      const source = bar.querySelector(":scope > div");
      if (!(source instanceof HTMLElement)) return;

      const ring = this.ensureProgressRing(bar);
      this.syncProgressRing(bar, source, ring);

      if (!source._md3eProgressObserved) {
        source._md3eProgressObserved = new MutationObserver(() => {
          this.syncProgressRing(bar, source, ring);
        });
        source._md3eProgressObserved.observe(source, {
          attributes: true,
          attributeFilter: ["style"],
        });
      }
    };

    const syncAll = (scope = document) => {
      this.forEachElementMatch(scope, ".cbi-progressbar", syncBar);
    };

    syncAll(document);

    this._progressRingThemeHandler = () => syncAll(target);
    window.addEventListener("md3e:themechange", this._progressRingThemeHandler);

    this.observeDomMutations(target, "progress-rings", (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          syncAll(node);
        }
      }
    }, {
      childList: true,
      subtree: true,
    });
  },

  ensureProgressRing(bar) {
    let ring = bar.querySelector(":scope > .md3e-progress-ring");

    if (!(ring instanceof HTMLElement)) {
      ring = document.createElement("span");
      ring.className = "md3e-progress-ring";
      ring.setAttribute("aria-hidden", "true");
      bar.insertBefore(ring, bar.firstChild);
    }

    if (!ring._md3eProgressArc) {
      ring.textContent = "";

      const radius = 14.5;
      const circumference = 2 * Math.PI * radius;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const track = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      const arc = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      svg.setAttribute("viewBox", "0 0 40 40");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");

      track.setAttribute("cx", "20");
      track.setAttribute("cy", "20");
      track.setAttribute("r", radius);
      track.setAttribute("fill", "none");
      track.setAttribute("stroke-width", "2.85");

      arc.setAttribute("cx", "20");
      arc.setAttribute("cy", "20");
      arc.setAttribute("r", radius);
      arc.setAttribute("fill", "none");
      arc.setAttribute("stroke-width", "3.3");
      arc.setAttribute("stroke-linecap", "round");
      arc.setAttribute("transform", "rotate(-90 20 20)");
      arc.setAttribute("stroke-dasharray", circumference.toFixed(2));

      svg.append(track, arc);
      ring.appendChild(svg);
      ring._md3eProgressTrack = track;
      ring._md3eProgressArc = arc;
      ring._md3eProgressCircumference = circumference;
    }

    return ring;
  },

  syncProgressRing(bar, source, ring) {
    const percent = Math.max(
      0,
      Math.min(100, Number.parseFloat(source.style.width) || 0),
    );

    bar.style.setProperty("--progress", `${percent}%`);
    this.updateProgressRingSvg(
      ring,
      percent / 100,
      this.getProgressRingPalette(bar),
    );
  },

  getProgressRingPalette(bar) {
    const styles = getComputedStyle(bar);
    const isDark =
      document.documentElement.getAttribute("data-darkmode") === "true";

    return {
      isDark,
      track: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary-container").trim(),
        isDark ? "#353246" : "#ddd7ff",
      ),
      progress: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary").trim(),
        isDark ? "#c6bcff" : "#7365f6",
      ),
    };
  },

  resolveProgressRingColor(value, fallback) {
    if (!this._progressRingColorCtx) {
      this._progressRingColorCtx = document.createElement("canvas").getContext(
        "2d",
      );
    }

    const ctx = this._progressRingColorCtx;
    if (!ctx) return fallback;

    ctx.fillStyle = fallback;

    try {
      ctx.fillStyle = value || fallback;
    } catch {}

    return ctx.fillStyle || fallback;
  },

  updateProgressRingSvg(ring, progress, palette) {
    if (!ring?._md3eProgressTrack || !ring?._md3eProgressArc) return;

    const clamped = Math.max(0, Math.min(1, progress || 0));
    const circumference = ring._md3eProgressCircumference;
    const dashOffset = circumference * (1 - clamped);
    const trackOpacity = palette.isDark ? 0.34 : 0.72;

    ring._md3eProgressTrack.setAttribute("stroke", palette.track);
    ring._md3eProgressTrack.setAttribute("stroke-opacity", trackOpacity);
    ring._md3eProgressArc.setAttribute("stroke", palette.progress);
    ring._md3eProgressArc.setAttribute(
      "stroke-dashoffset",
      dashOffset.toFixed(2),
    );
  },
