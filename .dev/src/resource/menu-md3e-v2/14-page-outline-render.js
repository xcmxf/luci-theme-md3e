  teardownPageChrome() {
    const main = document.querySelector("#maincontent");
    const content = document.querySelector(".docs-content");

    if (this._pageOutlineObserver) {
      this._pageOutlineObserver.disconnect();
      this._pageOutlineObserver = null;
    }

    if (this._pageChromeMutationDisconnect) {
      this._pageChromeMutationDisconnect();
      this._pageChromeMutationDisconnect = null;
    }

    main?.querySelector(":scope > .md3e-on-this-page")?.remove();
    document.body?.classList.remove("md3e-has-page-outline");

    if (content instanceof HTMLElement) {
      content._md3ePageChromeInit = false;
    }
  },

  syncPageOutline(sections) {
    const main = document.querySelector("#maincontent");
    const content = document.querySelector(".docs-content");
    if (!main || !content) return;

    let outline = main.querySelector(":scope > .md3e-on-this-page");
    if (!sections || sections.length < 2) {
      if (this._pageOutlineObserver) {
        this._pageOutlineObserver.disconnect();
        this._pageOutlineObserver = null;
      }

      outline?.remove();
      document.body?.classList.remove("md3e-has-page-outline");
      return;
    }

    const visibleSections = sections.slice(0, 8);
    const visibleSectionIds = new Set(
      visibleSections.map((section) => section.id),
    );

    if (!(outline instanceof HTMLElement)) {
      outline = E("aside", {
        class: "md3e-on-this-page",
        "aria-label": _("On this page"),
      });
      main.insertBefore(outline, content.nextSibling);
    }

    const outlineKey = visibleSections
      .map((section) => `${section.id}:${section.label}`)
      .join("|");
    const sameElements =
      Array.isArray(outline._md3eOutlineElements) &&
      outline._md3eOutlineElements.length === visibleSections.length &&
      visibleSections.every(
        (section, index) => outline._md3eOutlineElements[index] === section.element,
      );
    if (outline.dataset.md3eOutlineKey === outlineKey && sameElements) {
      document.body?.classList.add("md3e-has-page-outline");
      return;
    }

    document.body?.classList.add("md3e-has-page-outline");
    outline.dataset.md3eOutlineKey = outlineKey;
    outline._md3eOutlineElements = visibleSections.map(
      (section) => section.element,
    );
    outline.innerHTML = "";

    const nav = E("nav", { class: "md3e-on-this-page__nav" });
    nav.appendChild(
      E("div", { class: "md3e-on-this-page__title" }, [_("On this page")]),
    );

    const list = E("ol", { class: "md3e-on-this-page__list" });
    visibleSections.forEach((section, index) => {
      list.appendChild(
        E("li", { class: "md3e-on-this-page__item" }, [
          E(
            "a",
            {
              class: "md3e-on-this-page__link",
              href: "#" + section.id,
            },
            [section.label],
          ),
        ]),
      );
    });

    nav.appendChild(list);
    outline.appendChild(nav);

    if (this._pageOutlineObserver) {
      this._pageOutlineObserver.disconnect();
    }

    const links = Array.from(
      outline.querySelectorAll(".md3e-on-this-page__link"),
    );
    const applyActive = () => {
      const activeId = outline.dataset.md3eActiveSectionId;
      links.forEach((link) => {
        const isActive = link.getAttribute("href") === "#" + activeId;
        link.classList.toggle("active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };
    const setActive = (id, immediate = false) => {
      if (!visibleSectionIds.has(id)) return false;
      if (outline.dataset.md3eActiveSectionId === id && !immediate) return true;

      outline.dataset.md3eActiveSectionId = id;
      if (immediate) {
        applyActive();
      } else {
        this.scheduleFrame("_pageOutlineActiveFrame", applyActive);
      }

      return true;
    };
    const initialActiveId = location.hash?.slice(1);
    setActive(
      visibleSectionIds.has(initialActiveId) ? initialActiveId : visibleSections[0].id,
      true,
    );

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href")?.slice(1);
        if (!targetId) return;
        if (!visibleSectionIds.has(targetId)) return;

        const target = document.getElementById(targetId);
        if (!(target instanceof HTMLElement)) return;

        event.preventDefault();
        this._pageOutlineManualActiveUntil = Date.now() + 1400;
        setActive(targetId);
        history.replaceState(null, "", "#" + targetId);
        target.scrollIntoView({ block: "start", behavior: "smooth" });
        target.classList.add("md3e-outline-target-focus");

        if (target._md3eOutlineFocusTimer) {
          clearTimeout(target._md3eOutlineFocusTimer);
        }

        target._md3eOutlineFocusTimer = setTimeout(() => {
          target.classList.remove("md3e-outline-target-focus");
          delete target._md3eOutlineFocusTimer;
        }, 1400);
      });
    });

    this._pageOutlineObserver = new IntersectionObserver(
      (entries) => {
        if (Date.now() < (this._pageOutlineManualActiveUntil || 0)) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible?.target?.id) {
          setActive(visible.target.id);
        }
      },
      {
        rootMargin: "-18% 0px -64% 0px",
        threshold: [0, 0.1, 0.4],
      },
    );

    visibleSections.forEach((section) =>
      this._pageOutlineObserver.observe(section.element),
    );
  },
