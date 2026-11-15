  renderMobileMenu(tree, url) {
    const list = document.querySelector("#mobile-nav-list");
    const categories = this.getWorkspaceCategories(tree);
    if (!list || !categories.length) return;

    const nav = E("nav", {
      class: "md3e-mobile-primary-nav",
      "aria-label": _("Primary navigation"),
    });
    const primaryList = E("ul", { class: "md3e-mobile-primary-list" });
    const back = E("button", {
      class: "md3e-mobile-main-menu",
      type: "button",
      hidden: "",
    }, [
      E("span", {
        class: "md3e-mobile-primary-link__icon",
        "aria-hidden": "true",
      }, [this.createMobileDirectionIcon("back")]),
      E("span", _("Main menu")),
    ]);

    let section;
    const showMainMenu = (restoreFocus = false) => {
      const previous = section;
      if (previous) {
        previous.panel.hidden = true;
        previous.toggle.setAttribute("aria-expanded", "false");
        section = null;
      }

      back.hidden = true;
      primaryList.hidden = false;
      list.scrollTop = 0;
      if (restoreFocus) previous?.toggle.focus();
    };

    back.addEventListener("click", () => showMainMenu(true));
    nav.append(primaryList, back);

    const searchPages = [];
    categories.forEach((category) => {
      const isActive = category.name === L.env.dispatchpath[1];
      const pages = ui.menu.getChildren(category);
      const panelId = pages.length ? `md3e-mobile-secondary-${category.name}` : null;
      const toggle = this.buildMobilePrimaryButton(category, isActive, panelId);
      primaryList.appendChild(E("li", {}, [toggle]));

      if (!panelId) return;

      const sectionName = _(category.title);
      for (const page of pages) {
        const label = _(page.title);
        searchPages.push({
          label,
          section: sectionName,
          href: L.url(url, category.name, page.name),
          key: `${sectionName} ${label} ${category.name} ${page.name}`.toLowerCase(),
        });
      }

      const panel = this.buildMobileSecondaryPanel(category, url, panelId);
      nav.appendChild(panel);
      toggle.addEventListener("click", () => {
        section = { panel, toggle };
        primaryList.hidden = true;
        back.hidden = false;
        panel.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        list.scrollTop = 0;
        back.focus({ preventScroll: true });
      });
    });

    list.replaceChildren(nav);
    this.resetMobileMenu = showMainMenu;
    this.mobileSearchPages = searchPages;
    this.refreshMobileSearch?.();
  },
