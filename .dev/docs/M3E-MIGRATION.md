# LuCI M3 Expressive 迁移计划

以 Status → Overview 的内容优先布局和 Tonal Grouped List 为基准。保留 LuCI 的原生控件、数据和交互。Routing 是第一批试点，后续页面按内容结构迁移。

| 层            | 现有实现                                                                                               | 迁移约定                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token 和布局  | `02-system-tokens.css`、`02-dark-tokens.css`、`20-layout-*`、`24-responsive-shell.css`                 | 容器、边界和前景色统一使用语义 token。内容尺寸按区块可用宽度决定，侧栏断点只用于外壳。                                                                                   |
| 容器          | `22-feedback-sections.css`、`24-page-sections.css`、`24-parameter-groups.css`                          | 盘点主题标题和 LuCI 内容标题。内容优先页面保留一个可访问的页面名及可见分组标题。复用 Overview 的低色阶表面、内边距和分割线。有原生折叠功能时保留其状态与操作。           |
| 数据表        | `23-table-layout.css`、`23-table-network-interfaces.css`、`50-tabs.css` 的窄屏表格规则                 | 同时存在传统表格和移动标签行规则。用显式加入的表格区域复用原生 `table`、排序和按钮。宽表保留列比较，滚动范围限定在区块内部。以单条记录为任务中心时可用 DHCP 的卡片模式。 |
| 导航与选择    | 侧栏、抽屉、`23-segmented-tabs.css`、`24-navigation-tabs.css`、`50-tabs.css`                           | 区分目的地导航、同页页签和单一选项切换。统一选中、悬停和焦点。复用原生页签状态，按页面验证键盘操作。                                                                     |
| 表单和操作    | `21-controls-*`、`00-tokens-surfaces-buttons.css`、`20-forms-dropdowns.css`、`14-expressive-apply.css` | 先核对主次按钮、输入标签、帮助与错误、只读与禁用状态。复选保留多选语义，即时开关明确其用途。保留 LuCI 校验、依赖更新、保存与 Apply/Revert。                              |
| Dialog 与动效 | `22-modal-dialogs.css`、`21-modal-focus.js`、`03-theme-transitions.css`                                | 校验初始焦点、焦点圈定、关闭和焦点返回。色彩及形状用于交互反馈，保留减少动态效果模式。                                                                                   |

1. **只读状态表。** Routing 用邻居、路由、规则三组验证表格与空状态。复用条件是新页面也提供原生数据表和明确的区块标题。接下来核对 Connections、日志和防火墙状态，分别保留实时列表、文本和表格语义。
2. **管理表与表单。** 从 Network Interfaces、Firewall 和 System 的现有适配中提取可共享规则。按读写权限验证添加、删除、校验、保存、应用和恢复，检查第三方表单与插件。只有通过单页验证的变体才加入共享层。
3. **清理重复样式。** 按已迁移页面收敛大标题、表格移动覆盖、按钮和字段状态。共享样式通过组件选择器启用，逐页对照 Overview 检查浅深色、实际内容宽度、长字段、键盘和减少动态效果。

Google 的 M3 规范用于容器色阶、组件职责和自适应布局。Routing 的原生表格采用 Google Material 的数据表指导，保留列、表头和排序。业务数据及现有 DOM 交互仍由 LuCI 提供。

- [M3 颜色角色](https://m3.material.io/styles/color/the-color-system/) · [Lists](https://m3.material.io/components/lists/overview) · [自适应布局](https://m3.material.io/foundations/layout/canonical-examples/overview)
- [Navigation rail](https://m3.material.io/components/navigation-rail/overview) · [Tabs](https://m3.material.io/components/tabs/overview) · [Segmented buttons](https://m3.material.io/components/segmented-buttons/overview) · [Buttons](https://m3.material.io/components/buttons/overview)
- [Text fields](https://m3.material.io/components/text-fields/overview) · [Switches](https://m3.material.io/components/switch/overview) · [Checkboxes](https://m3.material.io/components/checkbox/overview) · [Menus](https://m3.material.io/components/menus/overview) · [Dialogs](https://m3.material.io/components/dialogs/overview)
- [M3 Motion](https://m3.material.io/styles/motion) · [Google Material 数据表（M2）](https://m2.material.io/develop/web/components/data-tables)

## 2026-11-15 方针更新

详见 [Status 内容区域重构方针](./STATUS-CONTENT-REFACTOR.md)。用户已取消旧 CSS、JS、gzip 和单 Part 体积限制；后续改为非阻断统计，不以旧预算限制设计与组件完整性。先以 Status 完成组件契约和实际页面收口，再扩展 System / Network。新增 KawaiiHachimi/luci-theme-material3 作为 LuCI 适配参考，Expressive 视觉仍以当前 Overview、Google M3 和 Material Web Unofficial 的组件指导为准。旧体积检查已从验证流程中移除。构建后可在 `.dev` 运行 `npm run report:asset-sizes` 查看静态产物和源码 Part 的体积。
