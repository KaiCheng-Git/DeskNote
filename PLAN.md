# DeskNote — 跨平台极简桌面便签工具 开发计划

## 项目位置

```
c:\Users\chengkai\OneDrive - Microsoft\Desktop\Personal Issue\Dev with AI\Tools\
└── DeskNote\               ← 项目根目录（Git 仓库）
    ├── PLAN.md             ← 本计划文件
    ├── src-tauri/          ← Rust 后端
    └── src/                ← Svelte 前端
```

---

## Context（背景与需求）

用户需要一个桌面生产力小工具，核心需求：
- **Windows 端**：便签置底嵌入桌面背景，不遮挡任何其他窗口
- **跨平台**：未来扩展到 iOS / Android（单一代码库）
- **极轻量**：运行内存目标 <50MB，安装包 <10MB
- **功能**：TODO、每日工作追踪、备忘录、日历、语音转文字、透明度调节
- **数据安全**：完全本地存储，零云依赖；JSON 导入/导出手动多端同步
- **Security & Privacy 优先**：数据不离设备，语音本地识别，加密存储
- **长期维护**：所有依赖均为官方维护或行业标准，无孤儿包风险
- **测试覆盖**：每个功能点有测试，防止回归（regression）
- **可迁移性**：框架/工具升级时可平滑迁移

---

## 技术选型与维护状态

| 层级 | 选择 | 维护方 | 状态 | 理由 |
|---|---|---|---|---|
| **应用框架** | Tauri v2 | CrabNebula + 社区 | ✅ 活跃 (83k★) | ~15-30MB，<10MB 包，Rust 安全 |
| **前端框架** | Svelte 5 | Vercel | ✅ 活跃 (80k★) | 编译时框架，最小 bundle |
| **透明/毛玻璃** | `window-vibrancy` | tauri-apps 官方 | ✅ 官方维护 | Windows Mica/Acrylic |
| **窗口状态** | `tauri-plugin-window-state` | tauri-apps 官方 | ✅ 官方维护 | 记住位置/大小 |
| **文件对话框** | `tauri-plugin-dialog` | tauri-apps 官方 | ✅ 官方维护 | 导入/导出 |
| **本地存储** | `tauri-plugin-sql` + SQLite | tauri-apps 官方 | ✅ 官方维护 | SQLite 30年标准 |
| **设置存储** | `tauri-plugin-store` | tauri-apps 官方 | ✅ 官方维护 | 轻量 KV 配置 |
| **语音转文字** | Whisper.cpp (本地) | OpenAI 开源 | ✅ 活跃 | **完全离线**，中文高精度 |
| **Windows 置底** | Win32 API (Rust FFI) | Microsoft | ✅ 永久支持 | 30年稳定 |
| **数据加密** | SQLCipher (AES-256) | Zetetic LLC | ✅ 活跃 | 行业标准 SQLite 加密 |
| **前端测试** | Vitest | Vite 团队 | ✅ 活跃 | 与 Vite 同生态 |
| **Rust 测试** | cargo test (内置) | Rust 官方 | ✅ 永久 | 无需额外依赖 |
| **E2E 测试** | Playwright | Microsoft | ✅ 活跃 | 跨平台 E2E |

> **原则**：只使用 tauri-apps 官方 org / 行业标准 / Microsoft 维护的组件。

---

## 架构设计（分层原则）

```
┌─────────────────────────────────────────────┐
│  Svelte 前端（UI 层，最容易替换）            │
│  src/lib/components/*.svelte                 │
│  src/lib/stores/*.ts                         │
├──────────────────────────────────────────────┤
│  Tauri IPC 命令接口（稳定边界）              │
│  #[tauri::command] fn xxx()                  │  ← 前后端唯一接触点
│  前后端可独立升级，接口不变即可              │
├──────────────────────────────────────────────┤
│  Rust 后端（最稳定层）                       │
│  src-tauri/src/lib.rs                        │
│  src-tauri/src/platform/windows.rs           │
└─────────────────────────────────────────────┘
```

**迁移友好设计：**
- Rust 层：Win32 API + SQLite，几十年不变，几乎不需迁移
- IPC 接口：命令名/参数保持向后兼容，前端可随时替换框架
- Svelte → 其他框架：只需重写 `src/` 目录，Rust 完全不动
- Tauri v2 → v3：官方提供迁移工具，`Cargo.lock` 锁定版本

---

## 安全与隐私设计

### 数据安全
- SQLite 数据库使用 **SQLCipher AES-256 加密**
- 密钥从设备唯一标识派生，用户无感知
- 数据文件：`%APPDATA%\desknote\desknote.db`（加密，不可直接读取）
- 日志级别：仅 `warn`/`error`，不记录用户内容

### 隐私保护
- **语音识别：完全本地**，使用 Whisper.cpp，音频永不离开设备
- **零网络请求**：无遥测、无分析、无外部 API 调用
- **文件系统权限**：严格限制在 `$APPLOCALDATA/desknote/**`
- **CSP 配置**：`default-src 'self'`，禁止外部资源加载

### 输入安全
- 所有 SQL 操作使用参数化查询（防 SQL 注入）
- 文本内容长度限制（TODO: 500字，笔记: 50000字）
- 文件导入时严格验证 JSON schema

---

## UI 设计：卡片网格方案

**响应式卡片布局**（窗口宽度自适应列数）：

```
窄屏（320px）                宽屏（580px+）
┌────────────────────┐       ┌──────────────┬──────────────┐
│ ░ DeskNote    ─ × │       │ ░ DeskNote        ─ × │
├────────────────────┤       ├──────────────┼──────────────┤
│ ☑ 今日待办   [+] │       │ ☑ 今日待办   │ ✎ 快速笔记  │
│  ☐ 完成设计稿    │       │  ☐ 完成设计稿 │ 今天开会...  │
│  ☐ 回复邮件      │       │  ☐ 回复邮件   │              │
├────────────────────┤       ├──────────────┴──────────────┤
│ ✎ 快速笔记   [+] │       │ 📋 2月21日 工作记录          │
│  今天开会讨论...  │       └─────────────────────────────┘
└────────────────────┘
```

**设计原则：**
- 无侧边导航，内容直接呈现
- 每个卡片可折叠/展开
- 设置页可控制显示哪些卡片及顺序
- 默认窗口：360×560px，右下角启动（不遮挡工作区）
- 键盘快捷键：`Enter` 添加，`Ctrl+N` 新笔记，`Esc` 取消

---

## 测试策略

### 分层测试

```
E2E Tests (Playwright)          ← 模拟用户操作全流程
    ↓
Integration Tests (Vitest)      ← 测试 store + DB 交互
    ↓
Unit Tests (Vitest + cargo test) ← 测试纯函数和 Rust 逻辑
```

### Rust 单元测试（cargo test）
```rust
// src-tauri/src/lib.rs
#[cfg(test)]
mod tests {
    #[test] fn test_input_validation() { ... }
    #[test] fn test_db_migration_version() { ... }
}
```

### 前端单元测试（Vitest）
```typescript
// src/lib/stores/__tests__/todos.test.ts
describe('todos store', () => {
  it('should add todo correctly')
  it('should toggle todo completion')
  it('should delete todo')
  it('should reject empty content')
  it('should enforce max length')
})

// src/lib/__tests__/db.test.ts
describe('database', () => {
  it('should initialize schema')
  it('should run migrations')
  it('should handle connection errors')
})
```

### E2E 测试（Playwright）
```typescript
// e2e/todo.spec.ts
test('add and complete a todo', async ({ page }) => { ... })
test('notes survive app restart', async ({ page }) => { ... })
test('voice input produces text', async ({ page }) => { ... })
```

### 覆盖率目标
| 层级 | 目标覆盖率 |
|---|---|
| Rust 核心逻辑 | ≥ 80% |
| 前端 store/db | ≥ 80% |
| UI 组件 | ≥ 60% |
| E2E 主流程 | 100%（所有 P0 功能） |

---

## 数据库设计（优化版）

### Schema（压缩 + 整型 ID + 迁移版本）

```sql
PRAGMA user_version = 1;   -- 迁移版本控制
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA auto_vacuum = INCREMENTAL;

CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 整型比 UUID 省 28 字节/行
  content TEXT NOT NULL CHECK(length(content) <= 500),
  is_done INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '' CHECK(length(title) <= 200),
  content BLOB NOT NULL DEFAULT '',      -- BLOB 存 zstd 压缩内容
  is_compressed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE work_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  content BLOB NOT NULL DEFAULT '',
  is_compressed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 已完成 TODO 归档表（超过 30 天自动迁移）
CREATE TABLE todos_archive AS SELECT * FROM todos WHERE 0;
```

### 迁移策略

```typescript
// 每次启动检查 user_version，按需运行迁移脚本
const MIGRATIONS = [
  null,                          // v0 → 初始状态
  migrateV1,                     // v1 → 当前版本
  // 未来：migrateV2, migrateV3 ...
];
```

### 存储优化预期
| 使用场景 | 优化前 | 优化后 |
|---|---|---|
| 100 条 TODO | ~50KB | ~15KB |
| 50 篇笔记 (各 500 字) | ~1.5MB | ~400KB |
| 1 年工作记录 | ~2MB | ~500KB |
| **合计 1 年** | **~4MB** | **~1MB** |

---

## 开发计划表

### GitHub Free Tier 限额
| 资源 | 免费额度 | DeskNote 预计用量 |
|---|---|---|
| GitHub Actions | **无限**（公开仓库） | 无限制 ✅ |
| Codespaces | 120 核心小时/月 | ~40小时/月（留余量）✅ |
| GitHub Projects | 无限（公开仓库） | ✅ |
| Dependabot | 无限 | ✅ |

### 每日 CI 自动执行（GitHub Actions）
```
每次 push → 自动运行：
  ✓ cargo test（Rust 单元测试）
  ✓ npm run check（TypeScript 类型检查）
  ✓ vitest run（前端单元测试）
  ✓ cargo clippy（Rust 代码质量）

每天 UTC 02:00（北京时间 10:00）→ 自动运行：
  ✓ 全量测试套件
  ✓ cargo audit（Rust 依赖安全扫描）
  ✓ npm audit（JS 依赖安全扫描）
  ✓ 生成测试覆盖率报告

每次推送 main 分支 → 自动构建：
  ✓ Windows .exe 安装包
  ✓ 上传 Artifact（保留 30 天）
```

### 开发里程碑

#### Milestone 1 — 安全基础（Week 1）
> 目标：在任何功能开发前，先把安全底座建好
- [ ] #1 修复 `vite.config.ts` 导入路径（已完成）
- [ ] #2 修复 `package.json` 依赖（已完成）
- [ ] #3 提交 `Cargo.lock` 到 git
- [ ] #4 配置 CSP（`default-src 'self'`）
- [ ] #5 限制 fs 权限范围到 `$APPLOCALDATA/desknote/**`
- [ ] #6 添加输入长度验证
- [ ] #7 配置日志级别（仅 warn/error）

#### Milestone 2 — 测试基础设施（Week 1-2）
> 目标：先搭测试框架，后续每个功能随开随测
- [ ] #8 配置 Vitest + 测试目录结构
- [ ] #9 添加 `svelte-check` 脚本
- [ ] #10 配置 GitHub Actions CI（push 触发）
- [ ] #11 配置每日定时安全扫描
- [ ] #12 配置 Dependabot（npm + cargo）
- [ ] #13 编写 todos store 单元测试
- [ ] #14 编写 notes store 单元测试
- [ ] #15 编写 DB 初始化和迁移测试

#### Milestone 3 — UI 重构（Week 2）
> 目标：从侧边栏改为卡片网格，更直观
- [ ] #16 重构主页面为响应式卡片网格
- [ ] #17 添加卡片折叠/展开功能
- [ ] #18 优化窗口初始位置（右下角）
- [ ] #19 添加键盘快捷键（Enter/Ctrl+N/Esc）
- [ ] #20 修复右键菜单（文本区域可复制粘贴）
- [ ] #21 添加空状态引导文案
- [ ] #22 添加今日日期显示

#### Milestone 4 — 数据层优化（Week 2-3）
> 目标：加密存储 + 压缩 + 迁移机制
- [ ] #23 集成 SQLCipher（AES-256 加密）
- [ ] #24 实现数据库迁移版本系统
- [ ] #25 实现文本内容 zstd 压缩存储
- [ ] #26 实现 TODO 自动归档（30天已完成）
- [ ] #27 添加定期 `VACUUM` 清理
- [ ] #28 编写数据层单元测试

#### Milestone 5 — 语音功能（Week 3）
> 目标：用本地 Whisper 替换云端 Web Speech API
- [ ] #29 集成 `whisper-rs` Rust 绑定
- [ ] #30 实现模型文件下载（首次使用时）
- [ ] #31 实现录音 → Whisper 转文字流程
- [ ] #32 前端语音录入 UI（录音中动画）
- [ ] #33 编写语音功能测试

#### Milestone 6 — 完整功能 Phase 2（Week 3-4）
- [ ] #34 工作记录模块（带日期分组）
- [ ] #35 日历视图（纯 Svelte 实现）
- [ ] #36 导入/导出（`.desknote.json`）
- [ ] #37 深色/浅色主题切换
- [ ] #38 卡片显示/隐藏/排序设置

#### Milestone 7 — 发布准备（Week 4）
- [ ] #39 Windows 代码签名配置
- [ ] #40 安装包优化（NSIS 配置）
- [ ] #41 多显示器窗口位置处理
- [ ] #42 E2E 测试（主流程全覆盖）
- [ ] #43 CHANGELOG.md 初始化
- [ ] #44 README 完善（截图、安装说明）
- [ ] #45 发布 v0.1.0

---

## 验证方式

1. **安全**：`cargo audit` 零高危漏洞；`npm audit` 零高危漏洞
2. **隐私**：Wireshark 抓包确认零网络请求（包括语音识别）
3. **置底效果**：打开多个应用，DeskNote 在所有窗口下方
4. **数据加密**：用十六进制编辑器打开 `.db` 文件，确认内容加密
5. **测试覆盖**：`vitest --coverage` 报告 ≥ 80%（核心逻辑）
6. **内存**：任务管理器确认 release 模式 <50MB
7. **存储**：使用 1 年后 DB 文件 <2MB

---

## 注意事项

- **Whisper 模型大小**：`ggml-small.bin` ~240MB，首次下载需提示用户
- **SQLCipher 编译**：需要 OpenSSL，devcontainer 已包含
- **Tauri v2 移动端**：Phase 3，iOS/Android 在 v2 mobile API 稳定后实施
- **安装包目标**：Windows NSIS < 8MB（不含 Whisper 模型，模型按需下载）
- **Cargo.lock 必须提交**：应用程序（非库）必须锁定依赖版本
