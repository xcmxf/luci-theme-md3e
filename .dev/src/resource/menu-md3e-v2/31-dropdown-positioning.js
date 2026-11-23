  resetDropdownPanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    if (panel._md3ePositionFrame) {
      cancelAnimationFrame(panel._md3ePositionFrame);
      panel._md3ePositionFrame = null;
    }

    if (panel._md3eModalAnimCleanup) {
      panel._md3eModalAnimCleanup();
      panel._md3eModalAnimCleanup = null;
    }
    panel.classList.remove("align-end");
    panel.classList.remove("above");
    panel.classList.remove("md3e-dropdown-fixed");
    panel.style.removeProperty("position");
    panel.style.removeProperty("top");
    panel.style.removeProperty("right");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("left");
    panel.style.removeProperty("min-width");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("max-width");
    panel.style.removeProperty("z-index");
  },

  measureDropdownPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return null;
    }

    panel.style.removeProperty("max-height");
    const cssMaxHeight = parseFloat(getComputedStyle(panel).maxHeight);
    const anchorRect = anchor.getBoundingClientRect();
    return {
      anchorRect,
      anchorWidth: Math.ceil(anchorRect.width),
      naturalWidth: Math.max(panel.scrollWidth, Math.ceil(anchorRect.width)),
      naturalHeight: Math.max(panel.scrollHeight, 0),
      cssMaxHeight: Number.isFinite(cssMaxHeight) && cssMaxHeight > 0 ? Math.floor(cssMaxHeight) : Infinity,
      viewportWidth: window.visualViewport?.width || window.innerWidth,
      viewportHeight: window.visualViewport?.height || window.innerHeight,
    };
  },

  positionDropdownPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }

    const viewportPadding = 16;
    const panelGap = 8;
    const metrics = this.measureDropdownPanel(anchor, panel);
    if (!metrics) return;

    const {
      anchorRect,
      anchorWidth,
      naturalWidth,
      naturalHeight,
      cssMaxHeight,
      viewportWidth,
      viewportHeight,
    } = metrics;

    const vpTop = window.visualViewport?.offsetTop || 0;
    const vpLeft = window.visualViewport?.offsetLeft || 0;
    const vpBottom = vpTop + viewportHeight;
    const vpRight = vpLeft + viewportWidth;
    const vpMaxWidth = Math.max(48, Math.floor(viewportWidth - viewportPadding * 2));

    let minLeft = vpLeft + viewportPadding;
    let maxRight = vpRight - viewportPadding;
    let minTop = vpTop + viewportPadding;
    let maxBottom = vpBottom - viewportPadding;

    const modal = anchor.closest("#modal_overlay > .modal");
    if (modal instanceof HTMLElement) {
      const modalRect = modal.getBoundingClientRect();
      const header = modal.querySelector(":scope > h4");
      const footer = modal.querySelector(":scope > .button-row, :scope > div.right, :scope > div.left");
      const headerBottom = header ? header.getBoundingClientRect().bottom : modalRect.top;
      const footerTop = footer ? footer.getBoundingClientRect().top : modalRect.bottom;
      minLeft = Math.max(minLeft, modalRect.left + panelGap);
      maxRight = Math.min(maxRight, modalRect.right - panelGap);
      minTop = Math.max(minTop, headerBottom + panelGap);
      maxBottom = Math.min(maxBottom, footerTop - panelGap);
    }

    const availableRight = Math.max(
      anchorWidth,
      Math.floor(maxRight - anchorRect.left),
    );
    const availableLeft = Math.max(
      anchorWidth,
      Math.floor(anchorRect.right - minLeft),
    );
    const alignEnd =
      naturalWidth > availableRight && availableLeft > availableRight;
    const maxWidth = Math.max(
      anchorWidth,
      alignEnd ? availableLeft : availableRight,
    );
    let availableBelow = Math.max(
      0,
      Math.floor(maxBottom - anchorRect.bottom - panelGap),
    );
    let availableAbove = Math.max(
      0,
      Math.floor(anchorRect.top - minTop - panelGap),
    );
    let useFixedEscape = false;
    if (modal instanceof HTMLElement && Math.max(availableBelow, availableAbove) < 96) {
      useFixedEscape = true;
      const vpBelow = Math.max(
        0,
        Math.floor(vpBottom - viewportPadding - anchorRect.bottom - panelGap),
      );
      const vpAbove = Math.max(
        0,
        Math.floor(anchorRect.top - (vpTop + viewportPadding) - panelGap),
      );
      availableBelow = Math.max(availableBelow, vpBelow);
      availableAbove = Math.max(availableAbove, vpAbove);
    }
    const openAbove =
      naturalHeight > availableBelow && availableAbove > availableBelow;
    const chosenSpace = openAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(
      Math.min(cssMaxHeight, 96),
      Math.min(chosenSpace, cssMaxHeight),
    );

    panel.classList.toggle("align-end", alignEnd);
    panel.classList.toggle("above", openAbove);
    panel.classList.toggle("md3e-dropdown-fixed", useFixedEscape);
    const clampedMinWidth = Math.min(anchorWidth, vpMaxWidth);
    panel.style.minWidth = `${clampedMinWidth}px`;
    panel.style.maxHeight = `${maxHeight}px`;

    if (useFixedEscape) {
      const fixedMaxWidth = vpMaxWidth;
      const panelWidth = Math.min(Math.max(clampedMinWidth, naturalWidth), fixedMaxWidth);
      const preferredLeft = alignEnd ? anchorRect.right - panelWidth : anchorRect.left;
      const clampedLeft = Math.max(
        vpLeft + viewportPadding,
        Math.min(preferredLeft, vpRight - viewportPadding - panelWidth),
      );
      const renderedHeight = Math.min(naturalHeight || maxHeight, maxHeight);
      const fixedTop = openAbove
        ? Math.max(vpTop + viewportPadding, Math.round(anchorRect.top - panelGap - renderedHeight))
        : Math.max(
            vpTop + viewportPadding,
            Math.min(
              Math.round(anchorRect.bottom + panelGap),
              Math.round(vpBottom - viewportPadding - renderedHeight),
            ),
          );
      panel.style.position = "fixed";
      panel.style.zIndex = "10050";
      if (modal instanceof HTMLElement && getComputedStyle(modal).transform !== "none") {
        if (panel._md3eModalAnimCleanup) panel._md3eModalAnimCleanup();
        const onAnimEnd = () => {
          panel._md3eModalAnimCleanup = null;
          if (panel.isConnected) this.positionDropdownPanel(anchor, panel);
        };
        modal.addEventListener("animationend", onAnimEnd, { once: true });
        panel._md3eModalAnimCleanup = () => modal.removeEventListener("animationend", onAnimEnd);
      }
      panel.style.maxWidth = `${fixedMaxWidth}px`;
      panel.style.left = `${Math.round(clampedLeft)}px`;
      panel.style.right = "auto";
      panel.style.top = `${fixedTop}px`;
      panel.style.bottom = "auto";
    } else {
      panel.style.position = "absolute";
      panel.style.removeProperty("z-index");
      panel.style.maxWidth = `${Math.min(maxWidth, vpMaxWidth)}px`;

      if (alignEnd) {
        panel.style.left = "auto";
        panel.style.right = "0";
      } else {
        panel.style.left = "0";
        panel.style.right = "auto";
      }

      if (openAbove) {
        panel.style.top = "auto";
        panel.style.bottom = `calc(100% + ${panelGap}px)`;
      } else {
        panel.style.top = `calc(100% + ${panelGap}px)`;
        panel.style.bottom = "auto";
      }
    }
  },
