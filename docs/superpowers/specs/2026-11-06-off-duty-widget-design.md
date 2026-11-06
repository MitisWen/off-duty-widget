# 下班小组件 · 设计文档

日期：2026-11-06
状态：已与用户确认（窗口形态、布局、视觉、功能范围、技术路线；玻璃效果与窗口尺寸的取舍以 2.2 节为准）

## 1. 目标

在现有 Tauri 2 + React 19 + TypeScript + Vite 脚手架上，做一个常驻 macOS 桌面的「下班倒计时」挂件：

- 无边框、透明、始终置顶、不占 Dock，只在菜单栏保留托盘入口。
- 卡片可自由拖动，位置跨启动记忆，双击标题区复位。
- 现代玻璃拟态 UI，跟随系统深浅色。
- 功能与 `asterra/plugins/offwork-countdown` 对齐：上下班时间可改、按工作日计算、进度条、收起/展开、周末休息态、加班正向计时。

**非目标**：Windows/Linux 适配、多语言、开机自启、自动更新、签名公证、全屏应用之上显示、自定义应用图标。

## 2. 技术路线（已选）

### 2.1 玻璃效果：原生 vibrancy + CSS 兜底

- 用 `window-vibrancy` 给窗口挂 `NSVisualEffectView`：material `Popover`，state `Active`（失焦仍保持磨砂），圆角 18。
- 卡片自身只叠一层极淡的白色渐变高光与 0.5px 内描边，不叠加 `backdrop-filter`。
- 若 vibrancy 挂载失败，Rust 回传状态，前端给 `<html>` 加 `data-vibrancy="off"`，改用半透明底色令牌，视觉降级但可读。
- 透明窗口在 macOS 需要 `app.macOSPrivateApi: true` 与 Cargo feature `macos-private-api`。

### 2.2 窗口贴着卡片收放

`NSVisualEffectView` 只能铺满窗口，无法只铺卡片。因此窗口尺寸始终等于卡片尺寸，不预留透明边距：

| 状态 | 窗口 = 卡片尺寸 |
|---|---|
| 展开 | 256 × 168 |
| 收起 | 184 × 40 |

- 窗口左上角位置在收放时保持不变，卡片向左上锚定，收起/展开不会平移。
- 收起：先触发内容 120ms 淡出，再调用一次 `setSize(184, 40)`；展开：先 `setSize(256, 168)`，再 120ms 淡入。不做逐帧窗口动画，避免与 vibrancy 叠加时抖动。
- 展开时若窗口右/下边超出当前显示器工作区，调用 `setPosition` 把窗口整体推回工作区内，再持久化。
- 圆角 18 在 vibrancy 挂载时设定，收起态沿用 18（高 40 的胶囊在视觉上已经足够圆）。
- 阴影使用 macOS 系统窗口阴影（`shadow: true`）；不用 CSS 外阴影（会超出窗口被裁掉）。
- 因窗口与卡片严格重合，**不做点击穿透**：透明区只剩圆角外的几个像素，不值得为它维护全局鼠标轮询。此项从早期方案中移除。

### 2.3 拖拽：原生 startDragging

- 标题区 `pointerdown` 记录起点，`pointermove` 位移超过 3px 才调用 `getCurrentWindow().startDragging()`，保证双击可被 WebView 正常识别。
- 双击标题区 → `invoke("reset_position")`，Rust 把窗口移到主屏工作区右下角（24px 边距）并持久化。
- 按钮点击 `stopPropagation`，不触发拖拽。

### 2.4 窗口位置记忆

- 位置存在 localStorage 的 `offwork:position`（物理像素坐标），启动时在前端校验后再 `setPosition`，窗口到首帧渲染完成才 `show`，所以不会闪。
- 只有用户拖拽产生的移动才写盘：拖拽开始后 5 秒内的 `Moved` 事件才更新位置，并做 200ms 节流；启动时系统放置窗口产生的 `Moved` 不会覆盖记忆位置。
- 启动后校验窗口矩形是否与任一显示器相交；完全不相交则调用 `reset_position` 回默认位置（主屏工作区右下角，24px 边距）。
- 首次启动无记忆位置时直接 `reset_position`。
- 窗口初始 `visible: false`：前端完成首帧渲染、设置好窗口尺寸后再 `show()`，避免启动时看到展开尺寸闪一下再收起。

### 2.5 托盘与退出

- 托盘图标为单色 template 图标（`scripts/make-tray-icon.mjs` 用 Node 标准库生成 36×36 PNG（18pt @2x）并提交到 `src-tauri/icons/tray.png`，`set_icon_as_template(true)`）。
- 菜单项：`显示/隐藏小组件`、`重置位置`、`退出`。
- 应用使用 `ActivationPolicy::Accessory`，不出现在 Dock 与 Cmd+Tab；关闭窗口即隐藏，退出只能从托盘。

### 2.6 Windows 适配

- 玻璃：改用 `window-vibrancy::apply_acrylic`（Win10 1809+ / Win11），着色交给 CSS 令牌；`vibrancy_enabled` 在 Windows 上返回 acrylic 是否成功。
- 圆角：调用 DWM `DwmSetWindowAttribute(DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND)`；Win11 生效，CSS 圆角同步降到 8px 与系统一致。Win10 忽略该属性，保持直角。
- 阴影：沿用 Tauri `shadow: true`，Tao 为无边框窗口提供 DWM 阴影。
- 字体：字体栈补 `Segoe UI`、`Microsoft YaHei`、`Microsoft JhengHei`。
- 托盘：macOS 用 36×36 单色 template 图标；Windows 用 32×32 暖色图标 `tray-win.png`（深浅任务栏都可见），不做 template。
- macOS 专属配置（`visibleOnAllWorkspaces`、`acceptFirstMouse`、`macOSPrivateApi`）在 Windows 上自动忽略。
- 构建：Windows 包必须在 Windows 上打（需要 MSVC + Windows SDK + NSIS/WiX），或用 GitHub Actions 的 `windows-latest`。

## 3. 窗口规格

| 项 | 值 |
|---|---|
| 窗口尺寸 | 展开 256 × 168，收起 184 × 40（CSS px） |
| decorations | false |
| transparent | true |
| alwaysOnTop | true |
| shadow | true（系统阴影，跟随圆角轮廓） |
| skipTaskbar | true |
| resizable | false |
| acceptFirstMouse | true（应用未激活时第一次点击即生效） |
| visibleOnAllWorkspaces | true |
| visible | 初始 false，首帧后由前端 show |
| 默认位置 | 主屏工作区右下角，右/下边距各 24px |
| 鼓励气泡窗口 | 236 × 68，透明无边框置顶、不可缩放、不抢焦点、点击穿透、跟随主窗口 |

## 4. 卡片 UI 规格

### 4.1 展开态

```
◐ 下班倒计时                    ⌃      标题区，高 26
02:41:09                               计时，36px / 600 / tabular-nums
距下班                        68%      状态 + 百分比，11px
▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░                 进度条，4px，圆角 2
09:00 – 18:00  ✎                       时间入口，11px，点击进入设置
```

- 卡片：256 × 168，圆角 18，内边距 10/14/12/14。
- 标题：12px / 600，`letter-spacing: .01em`。
- 计时：36px / 600 / `font-variant-numeric: tabular-nums`，行高 44。
- 次要文字：11px，使用二级文本色。
- 进度条：轨道用描边色，填充用当前状态强调色，宽度 1s 线性过渡。
- 时间入口：11px + 10px 铅笔图标，悬停提亮。

### 4.2 收起态

- 胶囊 184 × 40，圆角 18，左上角与展开态对齐。
- 内容：`◐ 距下班 02:41:09  ⌄`，12px，单行不换行，超长时省略时间前的文字。
- 点击胶囊任意位置展开；点击折叠按钮收起；收起时若处于设置视图，自动退出设置视图。

### 4.3 设置视图（卡片内切换，不改变窗口尺寸）

- 标题区保持不变（仍可拖动），主体替换为：
  - `上班 [09:00]`、`下班 [18:00]` 两行，标签 11px、时间输入 84px 宽。
  - 预留 14px 高的错误行，避免出错时卡片跳动。
  - 右下角 `取消`、`保存` 两个小按钮，保存为主按钮。
- 校验：时间解析失败或 `end <= start` 时错误行显示「下班时间需要晚于上班时间」，保存按钮禁用。
- 保存后写入 localStorage 并回到倒计时视图。

### 4.4 状态与配色

| 状态 | 判定 | 大字 | 标签 | 强调色（深/浅） | 进度 |
|---|---|---|---|---|---|
| before | 工作日、当前 < 上班 | 距上班倒计时 | 距上班 | 靛蓝 `#8B93FF` / `#5B63E8` | 0%，静态 |
| working | 上班 ≤ 当前 < 下班 | 距下班倒计时 | 距下班 | 日落渐变 `#FFB26B → #FF7A7A` / `#F08A4B → #E85D6B` | 已过工时占比，动态 |
| done | 工作日、当前 ≥ 下班 | 正向计时 | 加班 | 薄荷 `#5EE0A0` / `#1FA97A` | 满格 |
| rest | 周六、周日 | 休息日 | 好好放松一下 | 中性 `#A5ACBA` / `#7C8390` | 隐藏进度条与百分比 |

百分比：上班前显示 `0%`，工作中显示实际占比，下班后显示 `100%`，周末不显示。

### 4.5 下班后的鼓励消息（独立气泡窗口）

- 只在 `done` 阶段出现；先作为一条独立消息浮在卡片外侧，10 秒后自动收回卡片，提前点击则立即收回。
- 实现为第二个 Tauri 窗口 `bubble`：236 × 68、透明、无边框、置顶、不可缩放、不抢焦点，自身也挂 vibrancy（圆角 16）。
  - 拆窗口的原因：原生磨砂只能铺满整个窗口，如果放在同一个窗口里，气泡周围会露出一圈模糊矩形。
- 位置：默认贴卡片右侧、间距 8px；底部放不下就翻到卡片上方，并夹在当前显示器工作区内。
- 跟随：主窗口 `Moved` / `Resized` 时由 Rust 重新摆放；收起、进入设置、隐藏小组件时气泡一起隐藏。
- 收回后文案进入卡片，显示在进度条下方（10px 强调色标题 + 11px 正文，单行省略）。
- 内容：20 条鼓励文案随机取一条；刚下班的第一条标题是「下班时间到啦」，之后标题是「又加班 1 小时了」「又加班 1 小时 30 分钟了」这类累计时长。
- 随机规则：用 `(当天, 半小时桶)` 做哈希取词，同一半小时内稳定，卡片与气泡显示同一条；相邻两条保证不重复。
- 每半小时（`floor(overtimeSeconds / 1800)`）换一条；换条时重新以气泡浮出 10 秒，再收回卡片。
- 文案表在 `src/lib/praise.ts`，单元测试覆盖 20 条、时长文案、稳定性与相邻不重复。

### 4.6 颜色与质感令牌

深色（`prefers-color-scheme: dark`）：

- 主文本 `rgba(255,255,255,.94)`，次文本 `rgba(255,255,255,.58)`
- 描边 `rgba(255,255,255,.14)`
- 卡片底色 `rgba(255,255,255,.06)`（vibrancy 关闭时改为 `rgba(28,28,32,.86)`）
- 顶部高光：`linear-gradient(180deg, rgba(255,255,255,.08), transparent 42%)`

浅色：

- 主文本 `rgba(0,0,0,.88)`，次文本 `rgba(0,0,0,.55)`
- 描边 `rgba(0,0,0,.10)`
- 卡片底色 `rgba(255,255,255,.35)`（vibrancy 关闭时 `rgba(250,250,252,.92)`）

字体：`-apple-system, "SF Pro Text", "PingFang SC", sans-serif`。

### 4.7 动效与无障碍

- 统一 180ms `cubic-bezier(.2,.8,.2,1)`；进度条 1s 线性；收放内容 120ms 淡入淡出。
- `prefers-reduced-motion: reduce` 时移除过渡。
- 卡片根节点 `role="timer"`、`aria-live="off"`、`aria-label` 拼接状态与剩余时间；所有图标按钮有 `aria-label`。
- 键盘：Tab 可到达折叠按钮、时间入口、设置输入与按钮；`:focus-visible` 使用强调色描边环。

## 5. 计时逻辑

- 每 1000ms 触发一次，`new Date()` 重新计算，不做累加。
- 秒数计算基于当日 0 点起的秒数；`end` 必须大于 `start`，不支持跨午夜。
- 时区/休眠唤醒后由下一次 tick 自然纠正。
- 纯函数集中在 `src/lib/countdown.ts`：
  - `parseTime(text): number | null`（分钟）
  - `formatMinutes(minutes): string`（`HH:MM`）
  - `formatClock(seconds): string`（`HH:MM:SS`）
  - `readPhase(date, hours): { phase, seconds, progress }`
  - `validateHours(start, end): boolean`

## 6. 数据持久化

localStorage（键前缀 `offwork:`），`storage.ts` 封装，异常时降级为内存态：

| 键 | 值 | 默认 |
|---|---|---|
| `offwork:hours` | `{"start":540,"end":1080}` | 09:00–18:00 |
| `offwork:collapsed` | `"1"` / `"0"` | `"0"` |
| `offwork:position` | `{"x":1640,"y":1008}`（物理像素） | 无，启动时回右下角 |

## 7. 代码结构

```
src/
  App.tsx                      组装卡片
  main.tsx
  styles/tokens.css            颜色、字体、动效令牌
  styles/widget.css            卡片、胶囊、设置视图样式
  components/
    WidgetCard.tsx             状态容器：视图切换、时钟、拖拽、窗口尺寸同步
    WidgetHeader.tsx           标题、折叠按钮、拖拽与双击
    TimerFace.tsx              大数字、状态标签、百分比
    ProgressBar.tsx
    ScheduleEditor.tsx
    CollapsedPill.tsx
    OvertimeBubble.tsx         独立气泡窗口内容
  hooks/useNow.ts
  hooks/useWindowDrag.ts
  lib/countdown.ts
  lib/countdown.test.ts
  lib/praise.ts               每半小时一条的鼓励文案
  lib/praise.test.ts
  lib/placement.ts
  lib/placement.test.ts
  lib/storage.ts
  lib/desktop.ts               Tauri 调用封装 + 浏览器降级
  lib/desktop.test.ts          降级路径单测
src-tauri/
  src/lib.rs                   托盘、vibrancy、主窗口 + 气泡窗口、位置与复位命令
  tauri.conf.json              窗口配置、macOSPrivateApi
  Cargo.toml                   依赖与 features
  capabilities/default.json    窗口权限
scripts/make-tray-icon.mjs     生成单色托盘图标（提交产物）
```

`desktop.ts` 在非 Tauri 环境（`npm run dev` 直接用浏览器打开）判定 `window.__TAURI_INTERNALS__` 不存在，所有窗口操作降级为空实现，UI 仍可完整调试。

Rust 侧只负责托盘、vibrancy 初始化与 `reset_position`；窗口尺寸、显示/隐藏、位置读取统一由前端通过 Tauri JS API 完成，避免两套窗口操作逻辑。

`capabilities/default.json` 需要显式放开的窗口权限：`core:window:allow-start-dragging`、`allow-set-size`、`allow-set-position`、`allow-outer-position`、`allow-current-monitor`、`allow-show`、`allow-hide`。

## 8. 边界情况

| 情况 | 处理 |
|---|---|
| 时间解析失败 / end ≤ start | 错误行提示，禁用保存，不落盘 |
| localStorage 不可用 | 内存态，当前会话有效 |
| 多显示器、不同缩放 | 窗口尺寸用逻辑像素，位置由系统原生拖拽处理 |
| 显示器被拔掉 / 分辨率变化 | 启动及显示器变化后校验，窗口完全在屏幕外则回默认位 |
| 展开时靠近屏幕右下边缘 | 展开后把窗口推回工作区内并持久化，保证整张卡片可见 |
| 系统休眠唤醒 | 下一 tick 用 `Date` 重算，自动追上 |
| 托盘隐藏窗口 | 计时继续；显示时立即重算并按当前收起状态设置尺寸 |
| 周六/周日 | 显示休息态，不显示进度条与百分比 |
| 收起时正在编辑 | 退出编辑，丢弃未保存草稿 |
| 时钟跨天/跨周末 | 下一 tick 重新判定阶段 |

## 9. 测试与验收

自动化：

- Vitest 单测 `countdown.ts`：`parseTime` 合法/非法输入、`formatClock` 进位、`readPhase` 在上班前一秒/上班整点/下班前一秒/下班整点/周末的判定、`progress` 边界。
- Vitest 单测 `praise.ts`：20 条文案、0/30:00 的标题前缀、时长文案（30分钟/1小时/1小时30分钟）、同桶稳定、相邻不重复、负数保护。
- `placement.ts`：矩形相交、屏幕外判定、边界夹取。
- `desktop.ts` 降级路径：无 Tauri 全局时不抛错。
- `npm run build`（tsc + vite）作为类型与构建门禁。
- 新增脚本：`npm test`（vitest run）、`npm run typecheck`（tsc --noEmit）。

手工验收（macOS）：

1. 启动后窗口透明、圆角玻璃、无标题栏，不出现在 Dock 与 Cmd+Tab。
2. 标题区拖动跟手，位置重启后恢复；双击回右下角。
3. 收起后窗口缩到 184 × 40 胶囊，展开恢复，位置不跳；收起状态重启后保留。
4. 修改上下班时间 → 立即生效，重启保留；非法输入被拦截。
5. 上班前/工作中/下班后/周末四种状态的文案、颜色、进度正确。
6. 下班后卡片外侧浮出鼓励气泡；每半小时换一条；卡片贴近屏幕底部时气泡翻到上方；收起或进入设置时气泡隐藏。
7. 托盘菜单三项都能用；隐藏/显示小组件时气泡跟随；退出后进程结束。
8. 系统切换深/浅色后卡片与气泡配色跟随。
9. 窗口贴近屏幕右下角时展开，卡片完整可见。

## 10. 风险

- **原生 vibrancy 与透明窗口叠加**在不同 macOS 版本表现可能有差异；兜底方案已定义（`data-vibrancy="off"` 纯色半透明），验收时需确认 13.x 上正常。
- **系统窗口阴影**在纯透明窗口上是否跟随圆角轮廓需要在实机确认；若不明显，用 0.5px 内描边 + 顶部高光补足层次（不影响布局）。
- **WebKit 的 `input[type=time]` 样式能力有限**，只做基础外观统一；如观感差，可换成两个数字输入 + 自定义 stepper（不影响本设计其余部分）。
- **拖拽与双击共用标题区**依赖 3px 阈值；若实机上偶发误拖，改为「双击仅在标题文字区生效」。
- **收起/展开的窗口尺寸切换**没有逐帧动画，观感上是一次性跳变；内容淡入淡出会掩盖大部分突兀感，若仍不满意再考虑逐帧 `setSize`。
- **Windows 分支没有本地实机**：acrylic、DWM 圆角、托盘图标只做了编译层与 CI 验证，最终观感需要在 Windows 11 上验收；Win10 会是直角，acrylic 不可用时退化为 CSS 半透明。

## 11. 发布与 CI

- `.github/workflows/release.yml`：推送 `v*` 标签时，`macos-latest` 构建 universal（x86_64 + aarch64）dmg，`windows-latest` 构建 NSIS exe 与 msi，由 `tauri-action` 汇总到同一个 GitHub Release（默认草稿）。
- `.github/workflows/checks.yml`：push/PR 时在 macOS 与 Windows 上跑单测、类型检查、前端构建和 `cargo check`；Windows 任务同时验证 acrylic / DWM / 托盘代码能编译。
- 两个平台产物均未签名：macOS 需右键打开，Windows 需在 SmartScreen 里选择“仍要运行”；签名/公证接入点见 README。
