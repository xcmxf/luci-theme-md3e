  slugifyText(value, fallback = "section") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  },

  getPageOutlineSections(map) {
    if (!(map instanceof HTMLElement)) return [];

    const usedIds = new Set();

    return Array.from(map.children)
      .filter((node) => node.classList?.contains("cbi-section"))
      .map((section, index) => {
        const titleNode = section.querySelector(
          ":scope > .cbi-title h3, :scope > .cbi-title h2, :scope > h3, :scope > h2",
        );
        const label = this.getPageOutlineLabel(titleNode);
        if (label === "-") return null;
        if (!label) return null;
        if (!this.hasPageOutlineBodyContent(section, titleNode)) return null;

        if (!section.id || usedIds.has(section.id)) {
          const slug = this.slugifyText(label, `section-${index + 1}`);
          section.id = `md3e-${index + 1}-${slug}`;
        }

        usedIds.add(section.id);

        return { id: section.id, label, element: section };
      })
      .filter(Boolean);
  },

  isPageOutlineOmittedNode(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (node.hidden || node.getAttribute("aria-hidden") === "true") {
      return true;
    }

    const style = window.getComputedStyle?.(node);
    return Boolean(
      style &&
        (style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse"),
    );
  },

  hasPageOutlineBodyContent(section, titleNode) {
    if (!(section instanceof HTMLElement)) return false;
    if (this.isPageOutlineOmittedNode(section)) return false;

    const tableElement = "table";
    const ignoreSelectors = [
      ".cbi-title",
      ".md3e-on-this-page",
      "script",
      "style",
      "template",
    ].join(", ");
    const contentSelectors = [
      tableElement,
      "svg",
      "canvas",
      "img",
      "input",
      "select",
      "textarea",
      ".ifacebox",
      ".ifacebadge",
      ".cbi-section-node",
      ".cbi-value",
      ".cbi-map-descr",
      ".alert-message",
    ].join(", ");

    return Array.from(section.children).some((child) => {
      if (!(child instanceof HTMLElement)) return false;
      if (titleNode && (child === titleNode || child.contains(titleNode))) {
        return false;
      }
      if (child.matches(ignoreSelectors)) return false;
      if (this.isPageOutlineOmittedNode(child)) return false;
      if (child.matches(contentSelectors) || child.querySelector(contentSelectors)) {
        return true;
      }

      const text = child.textContent?.replace(/\s+/g, " ").trim();
      return Boolean(text);
    });
  },

  getPageOutlineLabel(titleNode) {
    if (!(titleNode instanceof HTMLElement)) return "";

    const clone = titleNode.cloneNode(true);
    clone
      .querySelectorAll("button, .cbi-section-hide, .cbi-button")
      .forEach((node) => node.remove());

    return (clone.textContent || "").replace(/\s+/g, " ").trim();
  },
