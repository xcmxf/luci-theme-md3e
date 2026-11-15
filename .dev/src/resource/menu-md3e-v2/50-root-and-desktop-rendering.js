  render(tree) {
    this.renderModeMenu(tree);
    this.initPageChrome();

    if (L.env.dispatchpath.length >= 3) {
      let node = tree;
      let url = "";

      for (let i = 0; i < 3 && node; i++) {
        const segment = L.env.dispatchpath[i];
        node = node.children?.[segment];
        url += (url ? "/" : "") + segment;
      }

      if (node) this.renderTabMenu(node, url);
    }

  },

  renderTabMenu(tree, url, level = 0) {
    const container = document.querySelector("#tabmenu");
    const ul = E("ul", { class: "tabs" });
    const children = ui.menu.getChildren(tree);
    let activeNode = null;

    children.forEach((child) => {
      const isActive = L.env.dispatchpath[3 + level] === child.name;

      ul.appendChild(
        E(
          "li",
          {
            class: `tabmenu-item-${child.name}${isActive ? " active" : ""}`,
          },
          [
            E("a", {
              href: L.url(url, child.name),
              ...(isActive ? { "aria-current": "page" } : {}),
            }, [_(child.title)]),
          ],
        ),
      );

      if (isActive) activeNode = child;
    });

    if (!ul.children.length) return E([]);

    container.appendChild(ul);
    container.style.display = "";

    if (activeNode) {
      this.renderTabMenu(activeNode, `${url}/${activeNode.name}`, level + 1);
    }

    return ul;
  },

  renderMainMenu(tree, url) {
    const sidebar = document.querySelector("#sidebar-nav-host");
    const categories = this.getWorkspaceCategories(tree);

    if (!categories.length || !sidebar) return;

    const pageCategory =
      categories.find((category) => category.name === L.env.dispatchpath[1]) ||
      categories[0];
    sidebar.innerHTML = "";

    const shell = E("div", { class: "md3e-nav-shell is-collapsed" });
    const rail = E("nav", {
      class: "md3e-mode-rail",
      "aria-label": _("Primary navigation"),
    });
    const railLogo = this.buildRailLogoButton();
    if (railLogo) rail.appendChild(railLogo);

    const panel = E("div", {
      class: "md3e-nav-panel",
      id: "md3e-section-nav",
      inert: "",
    });

    const updateButtons = (expandedMode) => {
      rail.querySelectorAll(".md3e-mode-link").forEach((button) => {
        const expanded = button.dataset.mode === expandedMode;
        button.setAttribute("aria-expanded", String(expanded));
      });
    };

    const collapse = (restoreFocus = false) => {
      if (restoreFocus && panel.contains(document.activeElement)) {
        rail.querySelector('[aria-expanded="true"]')?.focus();
      }
      shell.classList.add("is-collapsed");
      shell.classList.remove("is-expanded");
      panel.inert = true;
      updateButtons();
    };

    const expand = (category) => {
      panel.replaceChildren(this.buildNavPanel(category, url));
      shell.dataset.panelMode = category.name;
      shell.classList.remove("is-collapsed");
      shell.classList.add("is-expanded");
      panel.inert = false;
      updateButtons(category.name);
    };

    categories.forEach((category) => {
      const button = this.buildModeButton(
        category,
        category.name === pageCategory.name,
      );

      button.addEventListener("click", (event) => {
        const isCollapsed = shell.classList.contains("is-collapsed");
        const isSameMode = shell.dataset.panelMode === category.name;

        if (!isCollapsed && isSameMode) {
          collapse();
          return;
        }

        expand(category);
        if (event.detail === 0) {
          const link = panel.querySelector("[aria-current]") ||
            panel.querySelector("a");
          link?.focus();
        }
      });

      rail.appendChild(button);
    });

    shell.appendChild(rail);
    shell.appendChild(panel);
    sidebar.appendChild(shell);

    this.desktopShellElement = shell;
    this.collapseDesktopShell = collapse;
    this.syncLayoutMode();

    if (!this._desktopShellClickHandler) {
      this._desktopShellClickHandler = (event) => {
        const currentShell = this.desktopShellElement;
        if (!currentShell) return;
        if (this.isMobileViewport()) return;
        if (currentShell.classList.contains("is-collapsed")) return;
        if (currentShell.contains(event.target)) return;
        this.collapseDesktopShell?.();
      };
      document.addEventListener("click", this._desktopShellClickHandler);
    }

    if (!this._desktopShellEscHandler) {
      this._desktopShellEscHandler = (event) => {
        const currentShell = this.desktopShellElement;
        if (!currentShell) return;
        if (event.key === "Escape" && !currentShell.classList.contains("is-collapsed")) {
          this.collapseDesktopShell?.(true);
        }
      };
      document.addEventListener("keydown", this._desktopShellEscHandler);
    }

  },

  renderModeMenu(tree) {
    const ul = document.querySelector("#modemenu");
    const children = ui.menu.getChildren(tree);
    let activeChild = null;

    children.forEach((child, index) => {
      const isActive = L.env.requestpath.length
        ? child.name === L.env.requestpath[0]
        : index === 0;

      ul.appendChild(
        E(
          "li",
          {
            class: isActive ? "active" : "",
          },
          [E("a", { href: L.url(child.name) }, [_(child.title)])],
        ),
      );

      if (isActive) activeChild = child;
    });

    if (activeChild) {
      this.renderMainMenu(activeChild, activeChild.name);
      this.renderMobileMenu(activeChild, activeChild.name);
    }

    if (ul.children.length > 1) {
      ul.style.display = "";
    }
  },
