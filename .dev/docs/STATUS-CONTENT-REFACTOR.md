# LuCI 内容区域 M3 Expressive 重构方针

日期：2026-11-15
评估基线：HEAD 876c0ec 加当前未提交工作区；不能用 HEAD 代替现状。
状态：首批实施。体积统计和 Routing 表格已进入试点，后续页型按批次推进。

## 1. 决策与范围

第一阶段以整个 Status 模块为目标，Overview 是已批准的视觉基准，Routing 是共享表格组件的首个收敛试点。最终产物是统一的内容组件体系，供 System / Network 后续复用。

用户最新决定：取消旧 CSS、JS、gzip 和单 Part 体积上限作为本次重构的约束。允许为了清晰的组件结构、完整状态与响应式行为增加代码。不以凑预算、压缩源码或拆出无意义 Part 作为重构目标。体积仍记录，不作为通过/失败条件；实际加载、运行成本、依赖必要性与可维护性仍需评估。

构建后用 `npm run report:asset-sizes` 查看静态资源和源码 Part 体积。功能回归在独立环境或测试 VM 验证。

保留已批准 Overview 的布局、信息和交互。内容区域不增加 Hero、重复大标题、装饰性异形图案。页面名保留无障碍语义，分组名正常可见。导航导轨和 Logo 不属于本批范围。

## 2. 参考资料各自负责什么

| 来源                               | 使用方式                                               | 边界                                                          |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 当前 Overview                      | 色阶、分组间距、标题、分割线、折叠及信息密度的验收基线 | 已批准区域保持现状；共享改动必须对照                          |
| Google M3 / Expressive             | 信息层级、组件职责、语义色、状态、运动与自适应原则     | 官方宣传站的大标题和展示布局不直接迁入管理界面                |
| Material Web Unofficial            | 按钮、开关、选择组、Tabs 等非文字组件的交互参照        | 独立项目，不是 Google 官方实现；不直接安装整套组件库替换 LuCI |
| KawaiiHachimi/luci-theme-material3 | LuCI 原生 DOM、CBI 表单和移动表格适配案例              | 不作为我们的 Expressive 视觉基准，不整体移植其 CSS            |
| Modern Web Guidance                | 容器响应式、表格语义、页签溢出及浏览器降级             | 结合 LuCI 原有行为裁剪；示例代码不直接复制                    |

已阅读 M3 Expressive 官方介绍，确认其强调层级、内容分组、状态形状与有意义的运动。方案采用这些原则，在专业管理界面保留密集信息。

Material Web Unofficial 当前组件目录没有独立 Data Table 条目；不能把其他组件或示例宣传为官方 M3E 表格规范。数据表采用原生 HTML 语义、现有 Status 视觉基准和响应式表格指导。Expansion panel、Select 等在该站标注为 web extension，也须区别于官方组件。

### 新增 LuCI 主题参考的具体判断

参考仓库快照：38397ed978b0f9ed2d82b73d52c9a7c6bbd023ad。

- Readme.md 自述基于 LuCI Bootstrap，模仿 Material Design 3。可用来补充上游结构兼容清单。
- menu-material3.js:256–289 从真实表头提取文本，给单元格补 data-title。值得借鉴的是使用当前标签和翻译，而非 CSS 写死字段名。它按列索引配对，合并单元格、可选列、空态及动态变化仍需专项处理，不能直接作为通用转换器。
- mobile.css:195–217 将数据标签和行操作分区；这适合“单条记录”型移动呈现。Routing、Firewall 规则等需要横向比较的数据仍保持表格。
- cascade.css:1808–1875 使用轨道/滑块 token、checked 状态和位移实现开关，可参考原生 input 保持事件绑定的方式。其选择器覆盖所有 input[type=checkbox]，不应直接移入我们的主题：批量选择与多选仍保留 checkbox，布尔启用设置才采用 switch 表现。
- mobile.css:16 使用 max-device-width，167–173 广泛隐藏表头。我们的适配按内容容器宽度和显式组件标记启用，避免第三方插件被统一改成卡片。
- 表面、shape、排版、焦点、按压反馈和减少动效仍按我们自己的 M3E 组件契约实现。移植实际代码前确认对应文件的授权与署名要求；本轮没有复制第三方实现。

源码链接见文末。以上为代码观察，不代表对该主题做了完整运行或视觉验收。

## 3. 当前实现评估

既有 .dev/docs/M3E-MIGRATION.md 已提出 Overview 基准、Routing 试点和原生交互保留，方向可继续采用。需要补上组件所有权、样式变体、状态矩阵和逐批验收条件。

本轮实际观察：

- LuCI Overview 和 Routing 深色桌面视图：共同采用 tonal 容器、紧凑分组标题和分割线，页面直接进入内容。Overview 使用参数列表、利用率、接口摘要与空租约状态；Routing 保留多列表格。
- 参考站实际查看了按钮尺寸/层级与开关展示；官方 M3 页面通过浏览器读取。
- 其余 Status 页本轮以源码盘点为主，未逐页完成视觉验收。没有执行完整测试、重建或部署，不能据此宣称浅深色及所有屏宽都已通过。

### 现有职责及收敛入口

以下路径相对仓库根目录：

| 范围                       | 已存在实现                                                                                                     | 方案                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| tokens / 内容外壳          | .dev/src/media/main/02-system-tokens.css、02-dark-tokens.css、20-layout-content-shell.css                      | 复用语义 token，内容宽度与侧栏断点分离                                   |
| 参数与 grouped surface     | 24-parameter-groups.css:3、24-page-sections.css                                                                | 保持 Overview 参数外观；明确共享 surface / section header / divider 契约 |
| 数据表                     | 23-table-layout.css、24-data-groups.css；md3e-management.js:38、263                                            | Routing 和原生 grid 已有不同适配；合并展示约定，保留各 DOM 入口          |
| Processes                  | 23-processes.css:8、18                                                                                         | 提取可复用的表面/表头/行操作样式，保留命令列与数值列变体                 |
| Tabs                       | 23-segmented-tabs.css:3、24-navigation-tabs.css、public-md3e/components/50-tabs.css:1；menu-md3e-v2/22-tabs.js | 先标明路由导航与同页面板两类；收敛状态样式和尺寸所有权                   |
| Logs / 工具栏 / 部分配置页 | 24-management-pages.css:9；md3e-management.js:864                                                              | 提取 filter toolbar 与 log surface 契约；业务过滤仍由 LuCI 控制          |
| Realtime                   | md3e-management.js:541 及对应管理页样式                                                                        | 公共容器加 chart / legend / stats 变体，保留上游采样与图表               |
| Buttons / Fields / Dialogs | 21-controls-\*、22-modal-dialogs.css、public-md3e/components/20-forms-dropdowns.css                            | 一组件一主实现，兼容层只负责映射与必要例外                               |

### 已确认的维护问题，和未确认风险

1. Tabs 确有多层定义。23-segmented-tabs.css 设置胶囊、状态、动画，50-tabs.css 又定义同一菜单的背景、圆角、布局及模糊。这说明职责重叠，不能仅据文本断言所有覆盖都可删除。应逐状态核对 cascade 后合并。
2. header.ut:187–188 先加载 main.css，后加载 components.css。main 的相关规则处于 components / shell-pro 等 layer，50-tabs 的规则是未分层规则。迁移不能只考虑文件先后，普通声明的 layer 优先级同样重要。
3. 24-management-pages.css:9–22 的日志工具栏以 viewport 60rem / 36rem 调整列数；导轨展开后实际内容可能更窄。这是已确认实现，具体溢出本轮未复现，应改为组件容器决策。
4. 24-page-sections.css:34 起有对广泛 #view 标题和 .cbi-map-descr 的视觉隐藏。可能隐藏第三方页面有用说明，应缩小到确认冗余的内容；本轮未复现具体业务说明丢失。
5. md3e-management.js:263 已有原生表格滚动区、scope、空态和最小宽度处理，应优先复用。按列数决定 wide/medium 是启发式，长 IPv6、命令及翻译仍需按字段类型校正。
6. 不把所有 !important 或固定尺寸视为缺陷。旧 inline style 兼容规则需逐条保留原因；禁止通过继续提高优先级解决所有新差异。

### 体积快照（仅供趋势记录）

读取当前磁盘产物，gzip 使用 Node zlib level 9；未重新构建：

| 文件                                   |  raw B | gzip B |
| -------------------------------------- | -----: | -----: |
| htdocs/luci-static/md3e/main.css       | 388538 |  50788 |
| htdocs/luci-static/md3e/components.css |  65168 |   9718 |

旧脚本中的 main 389120 B、components 65536 B 等限制已被用户撤销为本计划约束。verify-source-part-budget.js 的 CSS 14 KiB 限制与 verify-css-budget.js 对 main part 的 28 KiB 统计还不一致；实施时统一改成按模块报告，不设置新的替代上限。代码分 Part 按职责决定，不按字节切割。

## 4. 内容区域组件契约

### 4.1 基础容器与信息结构

整体保持“必要页签 → 内容分组 → 分组内操作/数据”的顺序。筛选只放在其作用范围附近。一个逻辑分组拥有一层主 tonal surface；内部用间距和分割线区分内容。

从 Overview 复用 surface-container-low、on-surface、on-surface-variant、outline-variant、既有 shape/spacing/type tokens。统一 header 起点、边距、折叠按钮位置与 focus-visible。避免叠加大卡片、装饰阴影、嵌套白色矩形。

数据类型分别处理：参数用 dl；利用率保留真实值与进度；端口保留接口组件；多列记录用 table；日志保留可选取的文本；图表保留时间轴和图例。缺失数据与数值 0 明确区分。

### 4.2 表格

桌面保持列对齐，数值列按用途右对齐并使用 tabular-nums，技术字段允许复制。表头保留字段含义和说明。背景色、行分割、hover、focus-within 使用共享 token。

Routing / Firewall / Connections 等比较型数据：窄屏采用带可访问名称的局部横向滚动区，禁止通过缩小字体或逐字换行塞满列。是否 sticky header 按实际长表滚动任务决定，不给所有短表强制固定高度或双重滚动。

DHCP 等记录型数据：沿用已有移动卡片，显式字段标签、值和独立操作区；标签来源于真实表头/字段元数据及翻译，禁止 nth-child 硬编码语义。无法可靠转换的第三方表格使用横向滚动兜底。

避免以 display:block 全局改变所有 table。卡片转换需检验阅读顺序和表头关联，不能只靠 CSS 伪元素保证读屏语义。保留同一份真实控件节点，避免复制按钮、ID 或绑定。

空态只用紧凑本地化文本；有数据、加载中、错误、无结果分别呈现。没有上游错误状态时不伪造错误判断。

### 4.3 Tabs、选择组与导航

- URL 目的地使用原生链接，当前页用 aria-current；不统一强加 role=tab。
- 同页内容面板保留 LuCI 状态和关联，根据真实结构规范 aria-selected / panel 可访问名称；适配 .cbi-tab、li.active 等，不用全局 .active 猜测状态。
- 两三项选项切换才考虑 connected button group。Routing IPv4/IPv6 属于内容面板切换，不能因外形相似就改成配置选择器。
- 单行排布，空间不足局部横滑；选中或聚焦项可见。保留当前已实现的选中项 reveal，避免动态刷新后把用户手动滚动拉回。
- 选中状态有形状/边线区别，强制颜色模式仍可辨认；焦点不会被裁剪。指示器动效不改变标签尺寸或移动相邻内容。
- 本批不为了新 API 重写 LuCI tab runtime。focusgroup、hidden=until-found 等只在确认支持、原生状态同步和回退后考虑；默认保留已有跨浏览器行为。

### 4.4 按钮、开关与输入

按钮采用 Filled / Tonal / Outlined / Text 的明确任务层级。每个局部任务突出主要动作，表格行操作保持紧凑。危险行为保留明确标签、确认流程及上游权限，不仅依赖颜色。

借鉴参考站按压时的圆角变化和状态层。常规密集工具栏采用既有小/标准尺寸，触控可扩大命中区；不把演示站 L / XL 按钮放到管理表。避免按钮按压扩宽导致表格重排。

Switch 只适用于确有开关语义的布尔字段；checkbox 保留多选/批量选择语义。checked、unchecked、disabled、focus-visible、pressed 均有对应状态。保持 input 的 name、value、change/input 事件和验证，不能为了外观改成静态 div。

Text fields / Select 保留可见 label、帮助、错误、readonly/disabled，输入和多选项可根据内容增高。以 min-block-size 配合 padding，不用固定 max-height 裁掉翻译。已有 LuCI dropdown 保留键盘、清空与动态选项行为。

### 4.5 日志、图表和动效

日志筛选栏采用共享自适应 field grid。正文独立于筛选工具栏，长行在日志区内滚动，保留复制、过滤、排序、刷新和跳转；不添加未经请求的自动跟随。

图表采用公共 tonal group，图例/单位/统计与图表分层，按容器调整。采样、SVG 和刷新生命周期保持上游实现；持续数据刷新不触发整组入场动画。

动效用于按压、选择、展开反馈；颜色/透明度不使用造成闪烁的弹跳。prefers-reduced-motion 下减少位移与形变，状态仍然清楚。不要额外引入动画框架或全局页面切换动画。

## 5. 实施结构与顺序

沿用 Vite / Tailwind / LuCI 原生 JS。修改 source-assemblies.js 管理的 Part 或真实源码，再由构建产生 main.css、components.css、menu bundle；不手工维护两份同义产物。

第一批建议限定 Routing、共享数据分组样式及页签状态映射，Overview 只做回归对照。一次修改可说明共享收益并能独立回滚，之后再扩展。

| 批次                    | 交付目标                                   | 范围与验收出口                                                       |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| A：确定基线             | 当前工作区快照、组件职责表、体积非阻断统计 | 保留已有未提交改动；明确各页面旧入口和上游事件                       |
| B：Routing              | 统一 table/surface/tab 契约的实际试点      | IPv4/IPv6、邻居/路由/规则，空态/长地址/局部滚动；Overview 外观无变化 |
| C：Processes / Firewall | 共享表格与行操作变体                       | 命令长文本、规则层级、动作可达、动态刷新；不为统一外形删字段         |
| D：System / Kernel Log  | 共享 filter toolbar 和 log surface         | 控件状态、容器布局、日志滚动；两个日志页面分别核对原生 DOM           |
| E：Realtime Graphs      | 图表容器、图例、统计统一                   | Load / Bandwidth / Connections；Wireless 条件缺失时明确未验证        |
| F：Status 收口          | 浅深色、窄宽屏、关键原生交互一致           | 输出可复用组件文档，再启动 System / Network 配置页面迁移             |

每批按“读取原生 DOM → 明确视觉目标 → 修改单一组件主实现 → 最小页面适配 → 构建部署 → 实机查看”执行。共享组件先复用现有类；只有职责确实不同时新增变体。抽取不等于把所有 CSS 迁到一个大文件。

实施分工延续用户偏好：host 负责方针、范围和验收；实现可交 VM Vibe，使用独立工作区，给出允许文件、组件目标和结束报告。多个代理不并行写同一 worktree。完成后报告再审查，不循环催问进度。本轮没有启动实施代理。

## 6. 验收、部署与回滚约定

本轮交付方案，不开展专项 debug 或完整测试工程。实施以实机视觉与正常交互验收为主，构建正确性检查随修改范围执行，不能把选择器存在或脚本通过等同于 UI 正确。

- 页面视口覆盖 320、360、430、768、1280px；同时记录展开侧栏后的实际组件宽度，容器断点以内容可读性确定。
- 浅/深色、减少动效、键盘 focus、200% 文本放大、长翻译与长地址均有验收项。跨浏览器尚未检查的情况明确写出。
- 验证原生 tabs、刷新、过滤、排序、折叠、tooltip 和操作入口。真实破坏性按钮、配置 Apply 不作为只读状态页面验收动作。
- 不通过全页 overflow:hidden 掩盖溢出；允许明确标注的表格/日志内部横滑。窄屏按钮不相互遮挡，不截断关键地址。
- 回归 Overview 已批准部分，保留折叠状态、动态值、RX/TX 方向与 DHCP 交互。
- 记录 0/1/多条、长数据、缺失字段及硬件缺失场景；真实 VM 无法提供的数据可用隔离预览，明确区分模拟覆盖与实机证据。
- 在 dev VM 构建后，只部署审核过的主题资产到 openwrt-luci；记录原文件备份、部署清单、缓存版本和哈希。浏览器验收前核对实际加载文件，避免再次出现截图与实机版本不同。
- 每批回滚只恢复本批主题文件与对应资产版本，不覆盖用户已有改动，不重置整个仓库。
- 不自动 git add / commit / push。本文没有宣称现有资产与源码完成重建一致性核验。

## 7. Modern Web Guidance 采纳说明

本轮实际检索并完整读取 responsive-table、tabs、responsive-design。只应用于方案，没有生成组件代码。

- responsive-table：“Use standard `<table>` elements”——保留原生表格与表头关系；滚动区可聚焦、有名称。其 nth-child / 隐藏表头的示例不直接采用，服从本项目显式语义映射和无障碍要求。
- tabs：“DO NOT use this or the WAI-ARIA tabs pattern for page navigation”——将 URL 导航和同页面板分开；保留单行横滑与当前项可见。
- responsive-design：“adapt to their parent container's size rather than the viewport”——工具栏、表格和图表按内容区域宽度响应，视口断点主要用于导航外壳。
- 新 API 的支持情况实施时重新核实；尚未明确浏览器支持范围时，以原生 LuCI 可用行为为退路，不仅凭“最新”引入依赖。

## 8. 参考来源

- [Google：Building with M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)
- [Material Web Unofficial：组件展示](https://materialwebunofficial.github.io/#components)
- [按钮](https://materialwebunofficial.github.io/#buttons) · [开关](https://materialwebunofficial.github.io/#switch) · [Tabs](https://materialwebunofficial.github.io/#tabs)
- [LuCI Material3 参考仓库](https://github.com/KawaiiHachimi/luci-theme-material3)
- [参考主题移动样式，固定快照](https://github.com/KawaiiHachimi/luci-theme-material3/blob/38397ed978b0f9ed2d82b73d52c9a7c6bbd023ad/htdocs/luci-static/material3/mobile.css#L161)
- [参考主题表头标签映射](https://github.com/KawaiiHachimi/luci-theme-material3/blob/38397ed978b0f9ed2d82b73d52c9a7c6bbd023ad/htdocs/luci-static/resources/menu-material3.js#L256)
- [参考主题开关实现](https://github.com/KawaiiHachimi/luci-theme-material3/blob/38397ed978b0f9ed2d82b73d52c9a7c6bbd023ad/htdocs/luci-static/material3/cascade.css#L1808)

## 首批实施记录

- 旧 CSS、JS 和源码 Part 体积检查已移除。新增 `npm run report:asset-sizes`，单独报告构建文件及 gzip 体积，不设通过门槛。
- Routing 接入现有原生表格容器，复用可聚焦滚动区域、原生列头和空表处理。继续使用 LuCI 同页面板与排序，窄屏也保留真实列头。滚动提示随同一表格宽度档位变化。
- Routing 试点已部署到 OpenWrt VM，并核对了 HTTP 资产哈希。
- Routing 在 320、360、430、768、1280px 下均无整页横向溢出。目视检查了 320px 和桌面深色，以及 360px 浅色。通过键盘切换了 IPv4/IPv6、横滚宽表并对 Priority 列升降序排序。IPv6 邻居和路由在本机为空，未验证有数据的 IPv6 表格。Overview 桌面深色已抽查。
- 构建及源码组装检查通过。下一批使用 Processes 和 Firewall 核对哪些表格与行操作规则可以共享。

## 剩余内容区域实施记录

- Processes、nftables 和实时连接列表接入共享原生表格样式。进程表移动端在表头前提示横滑，防火墙保留规则、动作和原有详情信息。
- System Log / Kernel Log 工具栏按内容区域宽度切换列数。实时图表和统计表按图表所在区域响应。上游日志与统计刷新仍使用原实现。
- DHCP 的 Relay、Tags、VC、UC、PXE/TFTP、PXE over IPv6 接入共享表格、空态和行操作样式。Mount Points、LED、Switch VLAN 采用相同容器。相关 Network / System 原生编辑弹窗按路由和配置表单识别，复用设置分组。
- Attended Sysupgrade 的概览用色调容器区分说明、当前版本和升级入口。
- 内容区域的该批改动已部署到 OpenWrt VM，三份构建产物通过 HTTP 哈希比对。
- 浏览器抽查了 Processes、Firewall、System / Kernel Log、Realtime Load / Connections、DHCP Relay / Tags / PXE、在线升级概览。使用了 360 和 1280px，未执行会修改配置或服务状态的动作。Mount Points、LED、Switch 和 Wireless 的原生组件未在该 VM 出现，未做实机确认。
