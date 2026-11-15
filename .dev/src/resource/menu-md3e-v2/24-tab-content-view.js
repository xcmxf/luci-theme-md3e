  initTabContentViewAnimation(target) {
    if (!target) return;

    const replayAnimation = (el, className) => {
      if (!(el instanceof HTMLElement)) return;

      el.classList.remove(className);
      this.scheduleElementFrame(el, "_md3eReplayFrame", () => {
        this.scheduleElementFrame(el, "_md3eReplayWriteFrame", () => {
          el.classList.add(className);
          el.addEventListener(
            "animationend",
            () => el.classList.remove(className),
            { once: true },
          );
        });
      });
    };

    const watchView = (v) => {
      if (v._viewWatched) return;
      v._viewWatched = true;

      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.removedNodes) {
            if (!n.classList?.contains("spinning")) continue;
            replayAnimation(v, "tab-content-enter");
            return;
          }
        }
      }).observe(v, { childList: true });
    };

    const view = target.querySelector("#view");
    if (view) watchView(view);

    this._watchTabContentView = watchView;
    this._replayTabContentAnimation = replayAnimation;
  },
