  initVercelTabs() {
    if (this._vercelTabsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    const tabSelector = ".cbi-tabmenu, #tabmenu > .tabs, #tabmenu .tabs";
    if (!target.querySelector(tabSelector)) {
      this.watchForAddedElement(
        "_vercelTabsBootstrapObserver",
        target,
        tabSelector,
        () => this.initVercelTabs(),
      );
      return;
    }

    this._vercelTabsInitialized = true;
    this._vercelTabMenus = this._vercelTabMenus || new Set();

    const scheduleResizeSync = () => {
      clearTimeout(this._vercelTabsResizeTimer);
      this._vercelTabsResizeTimer = setTimeout(() => {
        this._vercelTabMenus?.forEach((menu) => {
          if (!menu.isConnected) {
            menu._md3eCleanupTabMenu?.();
            return;
          }
          menu._md3eUpdateActiveIndicator?.();
        });
      }, 100);
    };

    if (!this._vercelTabsResizeHandler) {
      this._vercelTabsResizeHandler = scheduleResizeSync;
      window.addEventListener("resize", this._vercelTabsResizeHandler);
      window.addEventListener("cbi-tab-active", () => {
        this._vercelTabMenus?.forEach((menu) => {
          if (!menu.isConnected) {
            menu._md3eCleanupTabMenu?.();
            return;
          }
          menu._md3eUpdateActiveIndicator?.();
        });
      }, true);
    }

    const bindTabMenu = (tabMenu) => {
      if (tabMenu.dataset.vercelInit) return;
      tabMenu.dataset.vercelInit = "1";

      let activeReady = false;
      let lastReveal;
      const updateActiveIndicator = () => {
        this.scheduleElementFrame(tabMenu, "_md3eTabActiveFrame", () => {
          const active =
            tabMenu.querySelector(
              "li:is(.cbi-tab, .active, [aria-selected=\"true\"], [data-tab-active=\"true\"])",
            ) ||
            tabMenu
              .querySelector(
                "li > :is(a[aria-current]:not([aria-current=\"false\"]), a[aria-selected=\"true\"], a.active, button[aria-selected=\"true\"])",
              )
              ?.closest("li");

          if (!active) return;

          const menuRect = tabMenu.getBoundingClientRect();
          const activeRect = active.getBoundingClientRect();
          if (activeRect.width === 0 && activeRect.height === 0) return;

          const needsJump = !activeReady;
          // Page navigation scrolls its outer nav. In-page menus scroll themselves.
          const scrollport = tabMenu.scrollWidth > tabMenu.clientWidth + 1
            ? tabMenu
            : tabMenu.closest("#tabmenu");
          const width = scrollport?.clientWidth || 0;
          const extent = scrollport?.scrollWidth || 0;
          const reveal = lastReveal?.active !== active ||
            lastReveal?.scrollport !== scrollport ||
            lastReveal?.width !== width || lastReveal?.extent !== extent;
          let offset = 0;
          if (reveal && width && extent > width + 1) {
            const fadeSize = parseFloat(getComputedStyle(scrollport).getPropertyValue("--md3e-tab-fade-size")) || 28;
            const clearance = Math.min(
              Math.max(36, Math.ceil(fadeSize) + 8),
              Math.max(4, Math.floor((width - activeRect.width) / 2)),
            );
            const left = scrollport.getBoundingClientRect().left + scrollport.clientLeft;
            const right = left + width;
            if (activeRect.left < left + clearance) {
              offset = activeRect.left - (left + clearance);
            } else if (activeRect.right > right - clearance) {
              offset = activeRect.right - (right - clearance);
            }
          }

          const targetLeft =
            activeRect.left - menuRect.left - tabMenu.clientLeft + tabMenu.scrollLeft;
          const targetTop =
            activeRect.top - menuRect.top - tabMenu.clientTop + tabMenu.scrollTop;

          this.scheduleElementFrame(tabMenu, "_md3eTabActiveWriteFrame", () => {
            if (needsJump) tabMenu.classList.add("tab-active-jump");

            // A user's own scroll never changes the selection or reveal key.
            if (reveal) {
              lastReveal = { active, scrollport, width, extent };
              if (offset) scrollport.scrollLeft += offset;
            }

            tabMenu.style.setProperty("--tab-active-left", `${targetLeft}px`);
            tabMenu.style.setProperty(
              "--tab-active-width",
              `${activeRect.width}px`,
            );
            tabMenu.style.setProperty("--tab-active-top", `${targetTop}px`);
            tabMenu.style.setProperty(
              "--tab-active-height",
              `${activeRect.height}px`,
            );

            if (needsJump) {
              activeReady = true;
              this.scheduleElementFrame(
                tabMenu,
                "_md3eTabActiveJumpFrame",
                () => tabMenu.classList.remove("tab-active-jump"),
              );
            }
          });
        });
      };

      tabMenu._md3eUpdateActiveIndicator = updateActiveIndicator;
      this._vercelTabMenus.add(tabMenu);

      const onScroll = () => updateActiveIndicator();
      tabMenu.addEventListener("scroll", onScroll, { passive: true });
      const onClick = () => queueMicrotask(updateActiveIndicator);
      tabMenu.addEventListener("click", onClick);

      let resizeObserver = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => updateActiveIndicator());
        resizeObserver.observe(tabMenu);
      }

      const observer = new MutationObserver(updateActiveIndicator);
      observer.observe(tabMenu, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "aria-current", "aria-selected", "data-tab-active"],
      });

      tabMenu._md3eCleanupTabMenu = () => {
        [
          "_md3eTabInitialActiveFrame",
          "_md3eTabActiveFrame",
          "_md3eTabActiveWriteFrame",
          "_md3eTabActiveJumpFrame",
        ].forEach((frameKey) => {
          if (tabMenu[frameKey]) cancelAnimationFrame(tabMenu[frameKey]);
          delete tabMenu[frameKey];
        });
        observer.disconnect();
        if (resizeObserver) resizeObserver.disconnect();
        tabMenu.removeEventListener("scroll", onScroll);
        tabMenu.removeEventListener("click", onClick);
        this._vercelTabMenus?.delete(tabMenu);
        delete tabMenu.dataset.vercelInit;
        delete tabMenu._md3eCleanupTabMenu;
        delete tabMenu._md3eUpdateActiveIndicator;
      };

      this.scheduleElementFrame(
        tabMenu,
        "_md3eTabInitialActiveFrame",
        updateActiveIndicator,
      );
    };

    const bindExistingTabs = (scope = document) => {
      if (scope instanceof HTMLElement && scope.matches(tabSelector)) {
        bindTabMenu(scope);
      }

      scope.querySelectorAll?.(tabSelector).forEach(bindTabMenu);
    };

    bindExistingTabs(document);

    const handleTabMutations = (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(tabSelector)) node._md3eCleanupTabMenu?.();
          node
            .querySelectorAll?.(tabSelector)
            .forEach((menu) => menu._md3eCleanupTabMenu?.());
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          bindExistingTabs(node);
        }
      }
    };

    this.observeDomMutations(target, "vercel-tabs", handleTabMutations, {
      childList: true,
      subtree: true,
    });

    const attachModalOverlay = (overlay) => {
      if (!(overlay instanceof HTMLElement) || overlay._md3eTabsObserved) return;
      overlay._md3eTabsObserved = true;
      bindExistingTabs(overlay);
      this.observeDomMutations(overlay, "vercel-tabs", handleTabMutations, {
        childList: true,
        subtree: true,
      });
    };

    const modalOverlay = document.getElementById("modal_overlay");
    if (modalOverlay) {
      attachModalOverlay(modalOverlay);
    } else if (target !== document.body) {
      const bodyObserver = new MutationObserver(() => {
        const overlay = document.getElementById("modal_overlay");
        if (!overlay) return;
        bodyObserver.disconnect();
        attachModalOverlay(overlay);
      });
      bodyObserver.observe(document.body, { childList: true });
    }
  },
