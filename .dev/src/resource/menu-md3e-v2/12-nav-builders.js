  buildRailLogoButton() {
    const source = document.querySelector(
      "header .brand-logo, header .mobile-header-brand-logo",
    );
    const logoSrc = source?.getAttribute("src");
    if (!logoSrc) return null;

    const brand = document.querySelector(
      "header .brand, header .mobile-header-brand",
    );
    const label =
      document.querySelector("header .brand-text")?.textContent?.trim() ||
      brand?.getAttribute("aria-label") ||
      _("Home");

    return E(
      "a",
      {
        class: "md3e-rail-logo",
        href: brand?.getAttribute("href") || L.url(),
        "aria-label": label,
        title: label,
      },
      [E("img", { src: logoSrc, alt: "", width: "28", height: "28" })],
    );
  },

  buildModeButton(mode, isActive) {
    const button = E("button", {
      class: "md3e-mode-link" + (isActive ? " active" : ""),
      type: "button",
      "data-mode": mode.name,
      "aria-controls": "md3e-section-nav",
      ...(isActive ? { "aria-current": "true" } : {}),
      "aria-expanded": "false",
    });

    const icon = E("span", {
      class: "md3e-mode-link__icon",
      "aria-hidden": "true",
    });
    icon.appendChild(this.createModeIcon(mode.name));

    button.appendChild(icon);
    button.appendChild(
      E("span", { class: "md3e-mode-link__label" }, [_(mode.title)]),
    );

    return button;
  },


  buildSubnavList(node, path, ancestors = []) {
    const lineage = [...ancestors, node.children];
    const list = E("ul", { class: "md3e-subnav-list" });
    const pages = ui.menu.getChildren(node);

    if (!pages.length) {
      list.appendChild(
        E(
          "li",
          { class: "md3e-subnav-empty" },
          _("No secondary destinations in this section."),
        ),
      );
      return list;
    }

    for (const page of pages) {
      const destination = [...path, page.name];
      const inBranch = destination.every(
        (name, index) => name === L.env.dispatchpath[index],
      );
      const current =
        inBranch && destination.length === L.env.dispatchpath.length;
      const link = E(
        "a",
        {
          class: "md3e-subnav-link",
          href: L.url(...destination),
          ...(current ? { "aria-current": "page" } : {}),
        },
        _(page.title),
      );
      const row = E("div", { class: "md3e-subnav-row" }, link);
      const item = E("li", {}, row);

      // An alias can resolve to a menu branch already visited on this path.
      if (!lineage.includes(page.children) && ui.menu.getChildren(page).length) {
        const children = this.buildSubnavList(page, destination, lineage);
        children.id = `md3e-desktop-nav-${destination.join("/")}`;
        children.hidden = !inBranch;
        row.appendChild(
          E(
            "button",
            {
              type: "button",
              class: "md3e-subnav-toggle",
              "aria-label": _("Subpages of %s").format(_(page.title)),
              "aria-controls": children.id,
              "aria-expanded": String(inBranch),
              click: (event) => {
                children.hidden = !children.hidden;
                event.currentTarget.setAttribute(
                  "aria-expanded",
                  String(!children.hidden),
                );
              },
            },
            E("span", { class: "md3e-subnav-chevron", "aria-hidden": "true" }),
          ),
        );
        item.appendChild(children);
      }

      list.appendChild(item);
    }

    return list;
  },

  buildNavPanel(category, baseUrl) {
    return E(
      "nav",
      {
        class: "md3e-section-nav",
        "aria-label": _(category.title),
      },
      this.buildSubnavList(category, [baseUrl, category.name]),
    );
  },

  createMobileDirectionIcon(direction) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    Object.entries({
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }).forEach(([name, value]) => svg.setAttribute(name, value));

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", direction === "back" ? "M19 12H5m7-7-7 7 7 7" : "M5 12h14m-7-7 7 7-7 7");
    svg.appendChild(path);
    return svg;
  },

  buildMobilePrimaryButton(category, isActive, panelId) {
    const icon = E("span", {
      class: "md3e-mobile-primary-link__icon",
      "aria-hidden": "true",
    }, [this.createModeIcon(category.name)]);
    const label = E("span", _(category.title));
    const children = [icon, label];

    if (panelId) {
      children.push(E("span", {
        class: "md3e-mobile-primary-link__arrow",
        "aria-hidden": "true",
      }, [this.createMobileDirectionIcon("forward")]));
    }

    return E("button", {
      class: "md3e-mobile-primary-toggle",
      type: "button",
      "data-mode": category.name,
      ...(panelId ? { "aria-controls": panelId, "aria-expanded": "false" } : { disabled: "" }),
      ...(isActive ? { "aria-current": "true" } : {}),
    }, children);
  },

  buildMobileSecondaryList(category, baseUrl) {
    const pages = ui.menu.getChildren(category);
    const list = E("ul", { class: "md3e-mobile-secondary-list" });

    pages.forEach((page) => {
      const isActive =
        category.name === L.env.dispatchpath[1] &&
        page.name === L.env.dispatchpath[2];

      list.appendChild(
        E("li", { class: "md3e-mobile-secondary-item" }, [
          E(
            "a",
            {
              class:
                "md3e-mobile-secondary-link" + (isActive ? " active" : ""),
              href: L.url(baseUrl, category.name, page.name),
              ...(isActive ? { "aria-current": "page" } : {}),
            },
            [_(page.title)],
          ),
        ]),
      );
    });

    return list;
  },

  buildMobileSecondaryPanel(category, baseUrl, panelId) {
    return E("section", {
      class: "md3e-mobile-secondary-wrap",
      id: panelId,
      "aria-labelledby": `${panelId}-label`,
      hidden: "",
    }, [
      E("p", { class: "md3e-mobile-section-label", id: `${panelId}-label` }, _(category.title)),
      this.buildMobileSecondaryList(category, baseUrl),
    ]);
  },
