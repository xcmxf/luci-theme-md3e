  initModalOverride() {
    const origShow = ui.showModal;
    const origHide = ui.hideModal;
    if (!origShow || !origHide) return;

    let hideTimer = null;
    let opener = null;
    const overlay = document.getElementById("modal_overlay");
    const modalIsOpen = () =>
      document.body.classList.contains("modal-overlay-active");
    const findOpener = this.initModalFocus(overlay, modalIsOpen);

    ui.showModal = function (title, children, ...classes) {
      if (!modalIsOpen()) opener = findOpener();
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      document.body.classList.remove("modal-overlay-exit");
      const dlg = origShow.call(this, title, children, ...classes);
      dlg.classList.remove("modal-exit");
      dlg.tabIndex = -1;
      dlg.focus({ preventScroll: true });
      return dlg;
    };

    ui.hideModal = function () {
      const dlg = overlay?.firstElementChild;
      if (!dlg || !modalIsOpen()) {
        origHide.call(this);
        return;
      }
      if (hideTimer !== null) return;

      dlg.classList.add("modal-exit");
      document.body.classList.add("modal-overlay-exit");

      const finish = () => {
        hideTimer = null;
        dlg.classList.remove("modal-exit");
        document.body.classList.remove("modal-overlay-exit");
        origHide.call(this);
        const trigger = opener;
        opener = null;
        if (trigger) {
          const destination = trigger.isConnected ? trigger : document.getElementById("md3e-workspace");
          destination?.focus({ preventScroll: true });
        }
      };

      hideTimer = setTimeout(finish, 180);
    };

    /* Override displayStatus to use toast instead of modal */
    const origDisplayStatus = ui.changes?.displayStatus;
    if (origDisplayStatus) {
      let statusToast = null;

      const interactive = ".btn, a[href], button, input, select, textarea";
      const hasControls = (content) =>
        content?.matches?.(interactive) || content?.querySelector?.(interactive);

      const dismissStatusToast = () => {
        const toast = statusToast;
        if (!toast) return;
        statusToast = null;
        toast.classList.add("toast-exit");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 400);
      };

      ui.changes.displayStatus = function (type, content) {
        /* Interactive content (connectivity warning) → keep as modal */
        if (type && [content].flat().some(hasControls)) {
          dismissStatusToast();
          origDisplayStatus.call(this, type, content);
          overlay?.firstElementChild?.classList.add("md3e-status-dialog");
          return;
        }

        if (modalIsOpen() &&
            overlay?.firstElementChild?.classList.contains("md3e-status-dialog")) {
          ui.hideModal();
        }

        /* Hide → dismiss toast */
        if (!type) {
          dismissStatusToast();
          if (this.was_polling) request.poll.start();
          return;
        }

        /* Show/update status toast */
        const container = document.getElementById("maincontent");
        if (!container) {
          origDisplayStatus.call(this, type, content);
          return;
        }

        if (!statusToast || !statusToast.parentNode) {
          statusToast = E("div", { class: "alert-message" });
          statusToast._toastInit = true;
          container.insertBefore(statusToast, container.firstChild);
        }

        /* Strip 'notice' so it renders as neutral toast, not warning */
        const classes = type
          .split(/\s+/)
          .filter((c) => c && c !== "notice");
        statusToast.className = "alert-message";
        if (classes.length)
          DOMTokenList.prototype.add.apply(statusToast.classList, classes);

        const isWarning = /warning|error|danger/.test(type);
        statusToast.setAttribute("role", isWarning ? "alert" : "status");
        L.dom.content(statusToast, content);

        if (!this.was_polling) {
          this.was_polling = request.poll.active();
          request.poll.stop();
        }
      };
    }
  },

  initToastAutoDismiss() {
    const DISMISS_DELAY = 30000;
    const container = document.getElementById("maincontent");
    if (!container) return;

    const updateIndices = () => {
      const toasts = container.querySelectorAll(
        ":scope > .alert-message:not(.toast-exit)",
      );
      toasts.forEach((t, i) => {
        t.style.setProperty("--toast-index", i);
      });
    };

    const dismissToast = (toast) => {
      if (toast._toastDismissing) return;
      toast._toastDismissing = true;
      if (toast._toastTimer) clearTimeout(toast._toastTimer);

      toast.classList.add("toast-exit");
      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
          updateIndices();
        },
        { once: true },
      );

      /* Fallback removal if animation doesn't fire */
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
          updateIndices();
        }
      }, 400);
    };

    const setupToast = (toast) => {
      if (toast._toastInit) return;
      toast._toastInit = true;

      /* Recalculate stacking indices (newest = index 0 = top) */
      updateIndices();

      /* Auto-dismiss after delay */
      toast._toastTimer = setTimeout(() => dismissToast(toast), DISMISS_DELAY);

      /* Dismiss on close button click */
      const btn = toast.querySelector(".btn");
      if (btn) {
        toast.classList.add("md3e-toast-has-close");
        btn.parentElement?.classList.add("md3e-toast-close-wrap");
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          dismissToast(toast);
        });
      }

      toast
        .querySelectorAll("div:not(.cbi-checkbox) > input[type='checkbox']")
        .forEach((checkbox) => {
          checkbox.parentElement?.classList.add("md3e-alert-checkbox-wrap");
        });
    };

    /* Watch for new toasts added to #maincontent */
    this.observeDomMutations(container, "toast-auto-dismiss", (mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            node.classList?.contains("alert-message") &&
            node.parentNode === container
          ) {
            setupToast(node);
          }
        }
      }
    }, { childList: true });

    /* Setup any existing toasts */
    container
      .querySelectorAll(":scope > .alert-message")
      .forEach(setupToast);
  },
