  initPageChrome() {
    const content = document.querySelector(".docs-content");
    if (!content || content._md3ePageChromeInit) return;
    if (this.isMobileViewport?.()) {
      this.teardownPageChrome();
      return;
    }

    const getMap = () => {
      const view = content.querySelector("#view");
      return view?.querySelector(".cbi-map") || view;
    };

    const hasOutlineCandidate = () => {
      const map = getMap();
      return this.getPageOutlineSections(map).length >= 2;
    };

    if (!hasOutlineCandidate()) {
      this.watchForAddedElement(
        "_pageChromeBootstrapObserver",
        content,
        ".cbi-map, .cbi-section, .cbi-section-node, .cbi-section-table, .cbi-value, .alert-message",
        () => this.initPageChrome(),
      );
      return;
    }

    const decorate = () => {
      content.querySelector(".md3e-page-hero")?.remove();

      const map = getMap();
      if (!map) return;

      const sections = this.getPageOutlineSections(map);
      this.syncPageOutline(sections);
    };

    decorate();

    const isPageChromeMutation = (mutation) => {
      const pageChromeSelector =
        ".cbi-map, .cbi-section, .cbi-section-node, .cbi-section-table, .cbi-value, .alert-message";

      if (
        mutation.target instanceof HTMLElement
      ) {
        if (
          mutation.target.matches(pageChromeSelector) ||
          mutation.target.closest(".cbi-title, h2, h3")
        ) {
          return true;
        }
      }

      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.matches?.(pageChromeSelector) ||
          node.querySelector?.(pageChromeSelector)
        );
      });
    };

    this._pageChromeMutationDisconnect = this.observeDomMutations(
      content,
      "page-chrome",
      (mutations) => {
        if (this.isMobileViewport?.()) {
          this.teardownPageChrome();
          return;
        }
        if (!mutations.some(isPageChromeMutation)) return;
        this.scheduleFrame("_pageChromeDecorateFrame", decorate);
      },
      {
        childList: true,
        attributes: true,
        attributeFilter: ["hidden", "style", "class", "aria-hidden"],
        subtree: true,
      },
    );

    content._md3ePageChromeInit = true;
  },
