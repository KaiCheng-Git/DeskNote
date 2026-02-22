# DeskNote — 跨平台极简桌面便签工具 开发计划

## 项目位置

```
c:\Users\chengkai\OneDrive - Microsoft\Desktop\Personal Issue\Dev with AI\Tools\
└── DeskNote\               ← 项目根目录
    ├── PLAN.md             ← 本计划文件
    ├── src-tauri/          ← Rust 后端
    └── src/                ← Svelte 前端
```

---

## Context（背景）

用户需要一个桌面生产力小工具，核心需求：
- **Windows 端**：便签置底嵌入桌面背景，不遮挡任何其他窗口
- **跨平台**：未来扩展到 iOS / Android（单一代码库）
- **极轻量**：运行内存极少（目标 <50MB），安装包小（<10MB）
- **功能**：TODO、每日工作追踪、备忘录、日历、语音转文字、透明度调节
- **数据安全**：完全本地存储，零云依赖；支持导入/导出 JSON 手动多端同步
- **长期维护**：所有依赖均为官方维护或行业标准，无社区孤儿包风险
- **开源**：不需上架 Microsoft Store，符合安全规范

---

## 技术选型与维护状态

| 层级 | 选择 | 维护方 | 状态 | 理由 |
|---|---|---|---|---|
| **应用框架** | Tauri v2 | CrabNebula + 社区 | ✅ 活跃 (83k ⭐, v2 2024稳定) | ~15-30MB内存，<10MB安装包，Rust安全性 |
| **前端框架** | Svelte 5 | Vercel | ✅ 活跃 (80k ⭐, v5 2024发布) | 编译时框架，零运行时虚拟DOM，最小bundle |
| **透明/毛玻璃** | `window-vibrancy` | tauri-apps 官方 org | ✅ 官方维护 | Windows Mica/Acrylic效果 |
| **窗口状态** | `tauri-plugin-window-state` | tauri-apps 官方 org | ✅ 官方维护 | 记住窗口位置/大小 |
| **文件对话框** | `tauri-plugin-dialog` | tauri-apps 官方 org | ✅ 官方维护 | 原生文件选择器，导入/导出用 |
| **本地存储** | `tauri-plugin-sql` + SQLite | tauri-apps 官方 org | ✅ 官方维护 | SQLite 30年标准，极轻量 |
| **设置存储** | `tauri-plugin-store` | tauri-apps 官方 org | ✅ 官方维护 | 窗口位置、透明度等配置 |
| **语音转文字** | Web Speech API | W3C 标准 | ✅ 永久标准 | 内置于 WebView2/WKWebView/Chrome，无依赖 |
| **Windows置底** | Win32 API (Rust FFI) | Microsoft | ✅ 永久支持 | SetWindowPos + WS_EX_TOOLWINDOW，30年稳定 |
| **系统托盘** | Tauri 内置 tray-icon | tauri-apps 官方 org | ✅ 官方内置 | 无需额外包 |

> **原则**：只使用 tauri-apps 官方 org 维护的插件 + W3C/微软行业标准。零社区孤儿包。

---

## 项目结构

```
DeskNote/
├── PLAN.md
├── package.json                     # Svelte + Vite 前端依赖
├── vite.config.ts
├── src/                             # Svelte 前端
│   ├── app.html
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Sidebar.svelte       # 图标导航栏
│   │   │   ├── TodoList.svelte      # TODO 列表
│   │   │   ├── NoteEditor.svelte    # 备忘录编辑
│   │   │   ├── WorkLog.svelte       # 每日工作追踪
│   │   │   ├── Calendar.svelte      # 日历视图
│   │   │   └── VoiceInput.svelte    # 语音录入
│   │   ├── stores/                  # Svelte stores（状态管理）
│   │   │   ├── todos.ts
│   │   │   ├── notes.ts
│   │   │   ├── worklog.ts
│   │   │   └── settings.ts
│   │   └── db.ts                    # tauri-plugin-sql 封装
│   └── routes/
│       └── +page.svelte             # 主页面
└── src-tauri/                       # Rust 后端
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs                  # 入口
        ├── lib.rs                   # Tauri commands
        └── platform/
            └── windows.rs           # Win32 置底实现
```

---

## 核心实现方案

### 1. Windows 桌面置底（Always Below）

**技术**：在 Rust 中通过 Win32 API 实现。Win32 API 由微软永久维护。

```rust
// src-tauri/src/platform/windows.rs
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::Win32::Foundation::HWND;

pub fn send_to_desktop(hwnd: HWND) {
    unsafe {
        // 1. 移除任务栏显示 + 阻止抢焦点
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        SetWindowLongW(hwnd, GWL_EXSTYLE,
            ex_style | WS_EX_TOOLWINDOW.0 as i32 | WS_EX_NOACTIVATE.0 as i32);

        // 2. 置底（沉到所有普通窗口下方）
        SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }
}
// 监听 focus_changed 事件，失焦时重新置底
```

**进阶方案（Phase 2）**：WorkerW 技术，将窗口嵌入桌面图标层（与 Rainmeter 相同方式），实现真正"在桌面图标后方"。

---

### 2. 透明度 + Windows 毛玻璃

```rust
// src-tauri/src/lib.rs
use window_vibrancy::{apply_mica, apply_acrylic, clear_vibrancy};

// Windows 11: Mica 效果（最佳性能）
apply_mica(&window, Some(true)).ok();

// Windows 10: Acrylic 效果
// apply_acrylic(&window, Some((0, 0, 0, 50))).ok();
```

```json
// tauri.conf.json
{
  "windows": [{
    "transparent": true,
    "decorations": false,
    "alwaysOnTop": false
  }]
}
```

用户可通过设置页滑块调节 0-100% 透明度，实时生效。

---

### 3. 语音转文字（Web Speech API）

**Web Speech API** 是 W3C 标准，内置于 Tauri 使用的所有 WebView 引擎中：
- Windows：WebView2（Chromium 内核，使用 Azure 语音服务）
- iOS：WKWebView（使用 Apple Speech Framework）
- Android：WebView（使用 Google Speech API）

```typescript
// src/lib/components/VoiceInput.svelte
const recognition = new (window.SpeechRecognition
  || window.webkitSpeechRecognition)();

recognition.lang = 'zh-CN';        // 中文普通话
recognition.continuous = false;
recognition.interimResults = true;  // 实时显示中间结果

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  appendToCurrentNote(transcript);
};

recognition.start();  // 点击麦克风按钮触发
```

零额外依赖，跨平台统一，识别精度依托各平台原生引擎（Windows Azure / Apple / Google），中文准确率高。

---

### 4. 数据库设计（SQLite）

```sql
-- 通过 tauri-plugin-sql 执行，存储在 AppData 目录
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  is_done INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,  -- 0=普通 1=重要 2=紧急
  due_date INTEGER,
  created_at INTEGER
);

CREATE TABLE work_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,   -- YYYY-MM-DD
  content TEXT,
  tags TEXT             -- JSON array
);
```

---

### 5. 导入/导出（手动多端同步）

```typescript
// 导出：一键生成 .desknote.json
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const data = { notes, todos, workLogs, exportedAt: Date.now() };
const path = await save({ filters: [{ name: 'DeskNote', extensions: ['json'] }] });
await writeTextFile(path, JSON.stringify(data, null, 2));

// 导入：选择文件并合并/覆盖
const path = await open({ filters: [{ name: 'DeskNote', extensions: ['json'] }] });
const data = JSON.parse(await readTextFile(path));
// 写入数据库...
```

---

## UI 设计原则

- **极简**：单侧边栏图标导航，无冗余元素
- **默认半透明**：窗口背景 85% 透明 + Mica 毛玻璃，用户可调整
- **小巧**：默认 300×480px，可自由拖拽调整大小
- **无标题栏**：自定义拖拽区，仅保留关闭/最小化
- **跟随系统主题**：自动深色/浅色

```
┌──────────────────────────┐
│ ░ DeskNote          ─ × │  ← 自定义极细标题栏（毛玻璃背景）
├──┬───────────────────────┤
│☐ │  今日待办             │  ← ☐=Todo ✎=Notes 📅=Work 🗓=Calendar
│✎ │  ☐ 完成设计稿         │
│📅│  ☐ 回复邮件           │
│🗓│  ✓ 晨会               │
│  │                       │
│🎙│  + 新建事项           │
│⚙ │                       │
└──┴───────────────────────┘
```

---

## 分阶段实现

### Phase 1 — MVP（Windows 核心）
- [ ] Tauri v2 + Svelte 项目初始化
- [ ] 自定义无标题栏窗口 + 透明毛玻璃（`window-vibrancy`）
- [ ] Windows 置底实现（Win32 Rust）
- [ ] TODO 增删改查 + 完成状态（SQLite）
- [ ] 备忘录（纯文本，SQLite）
- [ ] 系统托盘（显示/隐藏）
- [ ] 透明度调节设置

### Phase 2 — 完整功能
- [ ] 每日工作追踪（Work Log）
- [ ] 日历视图（纯 Svelte 实现，无第三方日历库）
- [ ] 语音转文字（Web Speech API）
- [ ] 深色/浅色主题切换
- [ ] 导入/导出（`.desknote.json`）
- [ ] Windows 置底进阶（WorkerW 嵌入桌面图标层）

### Phase 3 — 移动端 & 扩展
- [ ] Tauri v2 iOS 适配（基础功能）
- [ ] Tauri v2 Android 适配（基础功能）
- [ ] Markdown 格式导出
- [ ] 搜索功能（全文检索）

---

## 关键依赖清单

### Rust（src-tauri/Cargo.toml）
```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-window-state = "2"
window-vibrancy = "0.5"            # tauri-apps 官方
windows = { version = "0.58", features = [
  "Win32_UI_WindowsAndMessaging",
  "Win32_Foundation"
]}                                  # Microsoft 官方 Rust Windows crate
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### 前端（package.json）
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-sql": "^2",
    "@tauri-apps/plugin-store": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-fs": "^2"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2",
    "svelte": "^5",
    "vite": "^5",
    "@tauri-apps/cli": "^2"
  }
}
```

> 所有 `@tauri-apps/*` 包均来自 tauri-apps 官方 GitHub org，长期维护有保障。

---

## 验证方式

1. **置底效果**：`tauri dev` 启动后，打开浏览器/文件管理器，确认 DeskNote 沉入所有窗口下方，最小化全部窗口后可见
2. **透明度**：拖动设置页滑块，实时预览毛玻璃效果
3. **TODO 持久化**：添加事项 → 关闭应用 → 重新打开，数据保留
4. **语音**：点击 🎙，说"明天下午三点开会"，确认转录准确
5. **导入/导出**：导出 JSON → 清空数据 → 导入 → 数据恢复
6. **内存**：任务管理器确认 release 模式下 <50MB

---

## 注意事项

- **Windows 语音准确率**：Web Speech API 在 Windows 联网时使用 Azure 语音，中文准确率高；离线时降级到本地引擎，精度降低
- **Tauri v2 移动端**：iOS/Android 支持在 Phase 3，目前 v2 移动端仍在完善 API，Phase 1-2 专注 Windows
- **Win32 置底**：`HWND_BOTTOM` 方案在 Phase 1 足够；WorkerW 嵌入桌面图标层在 Phase 2 作为进阶选项
- **安装包大小目标**：Windows NSIS 安装包 < 8MB（Tauri 不捆绑 Chromium，使用系统 WebView2）
