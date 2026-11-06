# 下班小组件 · 实施计划

依据：`docs/superpowers/specs/2026-11-06-off-duty-widget-design.md`

## 任务

1. **依赖与配置**
   - `package.json`：加 `vitest`、`test`、`typecheck` 脚本。
   - `src-tauri/Cargo.toml`：`tauri` 开启 `tray-icon`、`image-png`、`macos-private-api`；加 `window-vibrancy`。
   - `tauri.conf.json`：无边框、透明、置顶、固定尺寸、初始隐藏、`macOSPrivateApi`。
   - `capabilities/default.json`：窗口权限。

2. **纯逻辑层**
   - `src/lib/countdown.ts` + 单测。
   - `src/lib/storage.ts`。
   - `src/hooks/useNow.ts`。
   - `src/lib/desktop.ts`（Tauri 封装 + 浏览器降级）+ 单测。

3. **UI**
   - `src/styles/tokens.css`、`widget.css`。
   - `WidgetCard`、`WidgetHeader`、`TimerFace`、`ProgressBar`、`ScheduleEditor`、`CollapsedPill`。
   - `App.tsx` 组装：时钟、收放、尺寸同步、拖拽、双击复位、首帧显示。

4. **Rust**
   - 托盘菜单（显示/隐藏、重置位置、退出）。
   - vibrancy 初始化 + 状态回传。
   - `reset_position` 命令。
   - Accessory 激活策略、关闭即隐藏。
   - 托盘单色图标生成脚本。

5. **验证**
   - `npm test`、`npm run typecheck`、`npm run build`、`cargo check`。
   - 手工验收清单交给用户。

## 顺序

配置 → 纯逻辑 + 测试 → desktop 桥 → UI → Rust → 全量验证。
