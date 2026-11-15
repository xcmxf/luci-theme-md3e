  initMobileMenu() {
    const overlay = document.querySelector("#mobile-menu-overlay");
    const menuToggle = document.querySelector("#mobile-menu-btn");
    const searchToggle = document.querySelector("#mobile-search-btn");
    if (!overlay || !menuToggle || overlay.dataset.md3eMobileInit === "true") return;
    overlay.dataset.md3eMobileInit = "true";

    const closeBtn = overlay.querySelector("#mobile-nav-close");
    const input = overlay.querySelector("#mobile-page-search");
    const navigationLabel = overlay.getAttribute("aria-label");
    let opener;

    const syncTriggers = () => {
      for (const button of [menuToggle, searchToggle]) {
        button?.setAttribute("aria-expanded", String(overlay.open && button.dataset.md3eOpen === overlay.dataset.mobileView));
      }
    };

    const show = (view, trigger) => {
      if (!this.isMobileViewport()) return;
      const searching = view === "search";
      overlay.dataset.mobileView = view;
      overlay.setAttribute("aria-label", searching ? searchToggle.getAttribute("aria-label") : navigationLabel);
      if (!overlay.open) {
        opener = trigger;
        overlay.showModal();
        document.body.classList.add("mobile-menu-open");
      }
      syncTriggers();

      if (searching) {
        this.refreshMobileSearch?.();
        input.focus({ preventScroll: true });
      } else {
        closeBtn?.focus({ preventScroll: true });
      }
    };

    const close = () => {
      if (!overlay.open) return;
      overlay.close();
      document.body.classList.remove("mobile-menu-open");
      this.resetMobileMenu?.();
      if (input) input.value = "";
      syncTriggers();
      if (this.isMobileViewport()) opener?.focus({ preventScroll: true });
      opener = null;
    };

    this.setMobileMenuOpen = (open) => open ? show("menu", menuToggle) : close();
    const openButtons = [menuToggle, searchToggle, ...overlay.querySelectorAll("[data-md3e-open]")];
    openButtons.forEach((button) =>
      button?.addEventListener("click", () => show(button.dataset.md3eOpen, button)),
    );

    overlay.addEventListener("click", (event) => {
      if (
        event.target === overlay ||
        event.target.closest("[data-md3e-close], .md3e-mobile-secondary-link, .mobile-nav-footer-btn--logout")
      ) {
        close();
      }
    });

    overlay.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });

    if (input) this.initMobileSearch(overlay, input);
  },

  initMobileSearch(overlay, input) {
    const panel = input.closest(".md3e-mobile-page-search");
    const status = panel.querySelector(".md3e-mobile-search-status");
    const results = panel.querySelector(".md3e-mobile-search-results");

    const refresh = () => {
      if (!overlay.open || overlay.dataset.mobileView !== "search") return;
      const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matches = terms.length
        ? (this.mobileSearchPages || []).filter(({ key }) => terms.every((term) => key.includes(term)))
        : [];
      status.textContent = !terms.length
        ? _("Find a LuCI page by name or section.")
        : matches.length
          ? _("Matching pages: %d").format(matches.length)
          : _("No matching pages.");
      results.replaceChildren(...matches.map(({ label, section, href }) =>
        E("li", {}, [E("a", { class: "md3e-mobile-secondary-link", href }, [
          E("span", label),
          E("span", { class: "md3e-mobile-search-section" }, section),
        ])]),
      ));
      panel.scrollTop = 0;
    };

    this.refreshMobileSearch = refresh;
    input.addEventListener("input", refresh);
    input.form.addEventListener("submit", (event) => {
      event.preventDefault();
      results.querySelector("a")?.click();
    });
  },
