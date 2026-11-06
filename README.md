# 下班小组件

桌面挂件：无边框、透明、置顶、可自由拖动，显示距离下班的时间。支持 macOS 与 Windows。

- 工作日 09:00–18:00 可改；周末显示休息态
- 上班前倒计时 / 工作中倒计时 + 进度 / 下班后加班计时
- 超过下班时间后，卡片外侧浮出鼓励消息，10 秒或点击后收回卡片；20 条文案每半小时随机一条，标题显示「又加班 1 小时了」这类累计时长
- 玻璃效果：macOS 用原生 vibrancy，Windows 用 acrylic（Win11 带圆角，Win10 为直角）
- 收起为胶囊，双击标题区复位位置，位置跨启动记忆
- 不占 Dock/任务栏，托盘菜单可显示/隐藏、重置位置、退出

## 开发

```bash
npm install
npm run tauri dev
```

只调 UI 时可以 `npm run dev` 用浏览器打开 http://localhost:1420（窗口相关能力会降级）。

## 检查

```bash
npm test        # Vitest 单元测试
npm run typecheck
npm run build
cd src-tauri && cargo check
```

Windows 专属代码（acrylic、DWM 圆角、托盘图标）只能在 Windows 上编译验证，CI 里有对应任务。本地想交叉检查需要 `llvm-rc`：

```bash
cargo check --target x86_64-pc-windows-msvc
```

## 构建与分发

macOS 通用包（Intel + Apple Silicon）：

```bash
rustup target add aarch64-apple-darwin
npm run tauri build -- --target universal-apple-darwin
```

产物：

- `src-tauri/target/universal-apple-darwin/release/bundle/macos/off-duty-widget.app`
- `src-tauri/target/universal-apple-darwin/release/bundle/dmg/off-duty-widget_0.1.0_universal.dmg`

Windows（在 Windows 上执行）：

```bash
npm install
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/nsis/*.exe` 与 `msi/*.msi`。

### 用 GitHub Actions 发版

`.github/workflows/release.yml` 会在推送 `v*` 标签时，用 `macos-latest` 和 `windows-latest` 分别构建，并把 dmg / exe / msi 挂到同一个 Release（默认草稿，确认后发布）。

```bash
git tag v0.1.0
git push origin v0.1.0
```

`.github/workflows/checks.yml` 在 push/PR 时跑测试、类型检查、构建和 Rust 检查（含 Windows）。

### 未签名说明

当前产物未签名：

- macOS 首次打开需右键 → 打开；若提示“已损坏”，执行 `xattr -cr /Applications/off-duty-widget.app`
- Windows SmartScreen 需点“更多信息” → “仍要运行”

要消除提示需要 Apple Developer Program（$99/年）和 Windows 代码签名证书，然后在构建流程里加入签名与公证。

## 图标

托盘图标由 `node scripts/make-tray-icon.mjs` 生成（macOS 单色模板 + Windows 彩色）。应用图标用 Tauri 默认图标，替换：

```bash
npm run tauri icon path/to/icon.png
```
