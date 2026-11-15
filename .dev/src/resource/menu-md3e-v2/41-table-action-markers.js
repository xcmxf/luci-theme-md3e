  markRowActionCells(scope) {
      const target = document.getElementById("maincontent") || document.body;
      if (!scope) scope = target;
      const rows = new Set();
      const touchedTables = new Set();
      const tableSelector = "table, .table, .cbi-section-table";
      const rowSelector = "tr, .tr, .cbi-section-table-row";
      const cellSelector = "th, td, .th, .td, .cbi-section-table-cell";
      const dataTitleCellSelector = "td[data-title], .td[data-title]";
      const buttonSelector =
        ".cbi-button, .btn, button, a.btn, input.btn, input[type='button'], input[type='submit']";
      const rowStateSelector = [
        rowSelector,
        dataTitleCellSelector,
        buttonSelector,
        ".cbi-section-table-titles",
        ".cbi-progressbar",
        ".progress",
      ].join(", ");

      if (scope instanceof HTMLElement) {
        const row = scope.matches(rowSelector)
          ? scope
          : scope.closest(rowSelector);
        if (row instanceof HTMLElement) rows.add(row);
      }

      this.forEachElementMatch(scope, rowStateSelector, (element) => {
        if (!(element instanceof HTMLElement)) return;

        const row = element.matches(rowSelector)
          ? element
          : element.closest(rowSelector);
        if (row instanceof HTMLElement) rows.add(row);
      });

      rows.forEach((row) => {
        const cells = Array.from(row.children).filter(
          (child) =>
            child instanceof HTMLElement && child.matches(cellSelector),
        );
        const cellStates = [];
        let actionCount = 0;
        let hasDataTitleCell = false;

        cells.forEach((cell) => {
          cell.classList.remove("md3e-row-action-cell", "md3e-row-actions");
          const children = Array.from(cell.children).filter(
            (child) => child instanceof HTMLElement,
          );
          children
            .filter((child) => child.classList.contains("md3e-row-action-cluster"))
            .forEach((cluster) =>
              cluster.classList.remove("md3e-row-action-cluster"),
            );
          const hasButtons = Boolean(cell.querySelector(buttonSelector));
          const hasDataTitle = cell.matches(dataTitleCellSelector);
          const actionClusters = hasButtons
            ? children.filter(
                (child) =>
                  child.matches("div") &&
                  child.querySelector(`:scope > :is(${buttonSelector})`),
              )
            : [];
          const buttonCount = hasButtons
            ? cell.querySelectorAll(buttonSelector).length
            : 0;
          hasDataTitleCell = hasDataTitleCell || hasDataTitle;
          cell.classList.toggle("md3e-table-action-cell", hasButtons);
          cell.classList.toggle("md3e-table-data-title-cell", hasDataTitle);
          cellStates.push({ cell, actionClusters, buttonCount, hasButtons });
        });

        row.classList.toggle(
          "md3e-table-title-row",
          Boolean(row.querySelector(".cbi-section-table-titles")),
        );
        row.classList.toggle(
          "md3e-table-progress-row",
          Boolean(row.querySelector(".cbi-progressbar, .progress")),
        );

        for (let index = cellStates.length - 1; index >= 0; index -= 1) {
          const { cell, actionClusters, buttonCount, hasButtons } =
            cellStates[index];
          actionClusters.forEach((cluster) =>
            cluster.classList.add("md3e-row-action-cluster"),
          );

          const compactText =
            cell.textContent.trim().replace(/\s+/g, " ").length <= 32;
          const isActionCell = hasButtons && compactText;

          cell.classList.toggle("md3e-row-action-cell", isActionCell);
          cell.classList.toggle(
            "md3e-row-actions",
            isActionCell && buttonCount >= 2,
          );

          if (!isActionCell) {
            break;
          }

          actionCount += 1;
        }

        row.classList.toggle("md3e-has-row-actions", actionCount >= 2);
        row.classList.toggle("md3e-table-data-title-row", hasDataTitleCell);

        const table = row.closest(tableSelector);
        if (table instanceof HTMLElement) touchedTables.add(table);
      });

      touchedTables.forEach((table) => {
        table.classList.toggle(
          "md3e-table-has-data-title",
          Boolean(table.querySelector(dataTitleCellSelector)),
        );
      });
  },
