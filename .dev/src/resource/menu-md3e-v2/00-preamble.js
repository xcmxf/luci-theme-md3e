"use strict";
"require baseclass";
"require ui";
"require request";

const MOBILE_LAYOUT_MAX_WIDTH = __MD3E_MOBILE_LAYOUT_MAX_WIDTH__;
const MOBILE_LAYOUT_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;
const TAB_CONTAINER_SELECTOR = ".cbi-section-node-tabbed, .cbi-map-tabbed";
const TAB_PANEL_SELECTOR =
  ".cbi-map-tabbed > [data-tab-title], .cbi-section-node-tabbed > [data-tab-title]";
const PAGE_ACTIONS_SELECTOR = ".cbi-page-actions";
const FORM_CONTROL_SELECTOR = "input, select, textarea";

return baseclass.extend({
