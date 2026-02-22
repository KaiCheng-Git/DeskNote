/**
 * Creates all GitHub milestones and issues for DeskNote.
 * Run: node scripts/create-issues.mjs <GITHUB_TOKEN>
 */

const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error("Usage: node scripts/create-issues.mjs <GITHUB_TOKEN>");
  process.exit(1);
}

const REPO = "KaiCheng-Git/DeskNote";
const BASE = `https://api.github.com/repos/${REPO}`;
const HEADERS = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

async function createMilestone(title, description) {
  const ms = await api("POST", "/milestones", { title, description, state: "open" });
  console.log(`  ✓ Milestone #${ms.number}: ${ms.title}`);
  return ms.number;
}

async function createIssue(title, body, milestoneNumber, labels = []) {
  const issue = await api("POST", "/issues", {
    title,
    body,
    milestone: milestoneNumber,
    labels,
  });
  console.log(`  ✓ Issue #${issue.number}: ${issue.title}`);
  return issue.number;
}

async function closeIssue(number) {
  await api("PATCH", `/issues/${number}`, { state: "closed" });
  console.log(`  ✓ Closed issue #${number}`);
}

async function createLabel(name, color, description) {
  try {
    await api("POST", "/labels", { name, color, description });
    console.log(`  ✓ Label: ${name}`);
  } catch {
    // Label may already exist
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log("\n=== Creating Labels ===");
await createLabel("security", "d93f0b", "Security & Privacy improvements");
await createLabel("testing", "0075ca", "Test infrastructure & coverage");
await createLabel("ui", "e4e669", "UI/UX changes");
await createLabel("data-layer", "5319e7", "Database & storage changes");
await createLabel("voice", "0e8a16", "Voice input feature");
await createLabel("phase-2", "bfd4f2", "Phase 2 features");
await createLabel("release", "fbca04", "Release preparation");
await createLabel("bug", "d73a4a", "Bug fix");

console.log("\n=== Creating Milestones ===");
const M1 = await createMilestone(
  "M1: 安全基础 (Security Base)",
  "Week 1 — 在任何功能开发前先把安全底座建好"
);
const M2 = await createMilestone(
  "M2: 测试基础设施 (Test Infrastructure)",
  "Week 1-2 — 先搭测试框架，后续每个功能随开随测"
);
const M3 = await createMilestone(
  "M3: UI重构 (UI Refactor)",
  "Week 2 — 从侧边栏改为卡片网格，更直观"
);
const M4 = await createMilestone(
  "M4: 数据层优化 (Data Layer)",
  "Week 2-3 — 加密存储 + 压缩 + 迁移机制"
);
const M5 = await createMilestone(
  "M5: 语音功能 (Voice Feature)",
  "Week 3 — 用本地 Whisper 替换云端 Web Speech API"
);
const M6 = await createMilestone(
  "M6: 完整功能 Phase 2",
  "Week 3-4 — 工作记录、日历、导入导出、主题"
);
const M7 = await createMilestone(
  "M7: 发布准备 (Release)",
  "Week 4 — 代码签名、E2E测试、发布 v0.1.0"
);

console.log("\n=== Milestone 1: 安全基础 ===");
const i1 = await createIssue(
  "Fix vite.config.ts import path",
  "## 问题\n`vite.config.ts` 错误地从 `@sveltejs/vite-plugin-svelte` 导入 `sveltekit`，应从 `@sveltejs/kit/vite` 导入。\n\n## 解决方案\n```ts\nimport { sveltekit } from \"@sveltejs/kit/vite\";\n```\n\n✅ **已在 commit `6d8632f` 中完成**",
  M1,
  ["bug"]
);
await closeIssue(i1);

const i2 = await createIssue(
  "Fix package.json dependencies",
  "## 问题\n`package.json` 含有错误依赖 `@sveltejs/vite-plugin-svelte`，缺少 `@sveltejs/kit` 和 `@sveltejs/adapter-static`。\n\n## 解决方案\n替换为正确依赖，并添加 `vitest`, `svelte-check`, `@vitest/coverage-v8`。\n\n✅ **已在 commit `6d8632f` 中完成**",
  M1,
  ["bug"]
);
await closeIssue(i2);

await createIssue(
  "Commit Cargo.lock to git",
  "## 背景\n应用程序（非库）必须将 `Cargo.lock` 提交到 git，确保构建可复现，并允许 `cargo audit` 扫描所有传递依赖。\n\n## 操作\n从 `.gitignore` 中移除 `Cargo.lock`（如有），运行 `git add src-tauri/Cargo.lock && git commit`。\n\n## 验证\n`cargo audit` 能扫描所有依赖",
  M1,
  ["security"]
);

await createIssue(
  "Configure Content Security Policy (CSP)",
  "## 问题\n`tauri.conf.json` 中 CSP 设置为 `null`（禁用），存在 XSS 风险。\n\n## 解决方案\n```json\n\"security\": {\n  \"csp\": \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'\"\n}\n```\n\n## 验证\n- 外部资源无法加载\n- 内联脚本被阻止",
  M1,
  ["security"]
);

await createIssue(
  "Restrict fs permission scope to app data directory",
  "## 问题\n`capabilities/default.json` 中 `fs:default` 权限过宽，允许访问任意文件系统。\n\n## 解决方案\n```json\n{\n  \"identifier\": \"fs:allow-read-text-file\",\n  \"allow\": [{\"path\": \"$APPLOCALDATA/desknote/**\"}]\n}\n```\n\n## 验证\n访问 app data 目录外的文件应被拒绝",
  M1,
  ["security"]
);

await createIssue(
  "Add input length validation",
  "## 需求\n防止超长输入导致存储膨胀或潜在 DoS。\n\n## 限制\n- TODO content: ≤ 500 字符\n- Note title: ≤ 200 字符\n- Note content: ≤ 50,000 字符\n\n## 实现\n- SQL: `CHECK(length(content) <= 500)`\n- 前端: `maxlength` 属性 + Svelte 校验\n- Rust IPC: 参数校验",
  M1,
  ["security"]
);

await createIssue(
  "Configure log level to warn/error only",
  "## 问题\nDebug 日志可能泄露用户内容（TODO 文本、笔记内容）。\n\n## 解决方案\n```toml\n# Cargo.toml\n[profile.release]\n# 在 lib.rs 中配置 log level\n```\n```rust\n// 仅输出 warn/error，不记录用户内容\nlog::set_max_level(LevelFilter::Warn);\n```\n\n## 验证\nRelease 模式下无 debug/info 日志输出",
  M1,
  ["security", "data-layer"]
);

console.log("\n=== Milestone 2: 测试基础设施 ===");
await createIssue(
  "Configure Vitest + test directory structure",
  "## 任务\n设置 Vitest 测试基础设施。\n\n## 目录结构\n```\nsrc/\n  lib/\n    stores/__tests__/\n      todos.test.ts\n      notes.test.ts\n    __tests__/\n      db.test.ts\ne2e/\n  todo.spec.ts\n  notes.spec.ts\n```\n\n## 配置\n```ts\n// vitest.config.ts\nexport default {\n  test: {\n    environment: 'jsdom',\n    coverage: { provider: 'v8', thresholds: { lines: 80 } }\n  }\n}\n```",
  M2,
  ["testing"]
);

await createIssue(
  "Add svelte-check script and fix TypeScript config",
  "## 任务\n添加 `svelte-check` TypeScript 类型检查。\n\n✅ **已部分完成**（`package.json` 中已添加 `check` 脚本和 `svelte-check` 依赖）\n\n## 待完成\n- 确认 `svelte.config.js` 正确配置\n- 在 CI 中验证 `npm run check` 通过\n- 修复所有现有类型错误",
  M2,
  ["testing"]
);

await createIssue(
  "Set up GitHub Actions CI (push-triggered)",
  "## 任务\n配置 push 触发的 CI 流水线：TypeScript 检查、Vitest 单测、Rust clippy、cargo test。\n\n✅ **已完成**（见 `.github/workflows/ci.yml`）\n\n## 验证\n推送代码后 GitHub Actions 自动运行所有检查",
  M2,
  ["testing"]
);

await createIssue(
  "Configure daily scheduled security scan",
  "## 任务\n每天 UTC 02:00 自动运行安全扫描和覆盖率报告。\n\n✅ **已完成**（ci.yml 中 `security-audit` 和 `coverage` jobs，cron: `0 2 * * *`）\n\n## 包含\n- `cargo audit` — Rust 依赖漏洞扫描\n- `npm audit --audit-level=high` — JS 依赖安全扫描\n- Vitest coverage report\n- cargo-tarpaulin Rust coverage",
  M2,
  ["testing", "security"]
);

await createIssue(
  "Configure Dependabot for automated dependency updates",
  "## 任务\n自动创建依赖更新 PR，及时修复安全漏洞。\n\n✅ **已完成**（见 `.github/dependabot.yml`）\n\n## 配置\n- npm: 每周一 09:00 (Asia/Shanghai)，分组更新\n- cargo: 每周一 09:00 (Asia/Shanghai)，分组更新\n- 每个生态系统最多 5 个开放 PR",
  M2,
  ["testing", "security"]
);

await createIssue(
  "Write todos store unit tests",
  "## 测试用例\n```ts\ndescribe('todos store', () => {\n  it('should load todos from DB on init')\n  it('should add todo with correct fields')\n  it('should reject empty content')\n  it('should reject content > 500 chars')\n  it('should toggle completion status')\n  it('should delete todo')\n  it('should filter pending vs done todos')\n})\n```\n\n## 覆盖率目标\n≥ 80% lines",
  M2,
  ["testing"]
);

await createIssue(
  "Write notes store unit tests",
  "## 测试用例\n```ts\ndescribe('notes store', () => {\n  it('should load notes on init')\n  it('should create note with unique id')\n  it('should update note content and timestamp')\n  it('should delete note')\n  it('should set active note')\n  it('should reject title > 200 chars')\n})\n```\n\n## 覆盖率目标\n≥ 80% lines",
  M2,
  ["testing"]
);

await createIssue(
  "Write DB initialization and migration tests",
  "## 测试用例\n```ts\ndescribe('database', () => {\n  it('should initialize schema on first run')\n  it('should run migrations based on user_version')\n  it('should not re-run already-applied migrations')\n  it('should handle connection errors gracefully')\n  it('should use WAL journal mode')\n})\n```\n\n## Rust 测试\n```rust\n#[test] fn test_migration_version()\n#[test] fn test_input_validation()\n```",
  M2,
  ["testing", "data-layer"]
);

console.log("\n=== Milestone 3: UI重构 ===");
await createIssue(
  "Refactor main page to responsive card grid layout",
  "## 设计\n见 PLAN.md UI 设计章节。\n\n## 窄屏（<480px）: 单列堆叠\n## 宽屏（≥480px）: 双列网格\n\n```svelte\n<!-- 替换侧边栏为卡片网格 -->\n<div class=\"card-grid\">\n  <TodoCard />\n  <NoteCard />\n  <WorkLogCard />\n</div>\n```\n\n## 要求\n- 移除 Sidebar.svelte 侧边栏导航\n- 每个卡片独立组件（TodoCard, NoteCard, WorkLogCard）\n- CSS Grid 响应式布局",
  M3,
  ["ui"]
);

await createIssue(
  "Add card collapse/expand functionality",
  "## 需求\n每个卡片有折叠/展开按钮，节省屏幕空间。\n\n## 实现\n```svelte\n<script>\n  let collapsed = $state(false);\n</script>\n<div class=\"card\">\n  <header onclick={() => collapsed = !collapsed}>\n    <span>{title}</span>\n    <span>{collapsed ? '▸' : '▾'}</span>\n  </header>\n  {#if !collapsed}\n    <div class=\"card-body\">...</div>\n  {/if}\n</div>\n```\n\n## 状态持久化\n折叠状态保存到 `tauri-plugin-store`",
  M3,
  ["ui"]
);

await createIssue(
  "Fix window initial position to bottom-right corner",
  "## 问题\n当前 `tauri.conf.json` 中 `x:20, y:60` 将窗口放在左上角，应在右下角启动（不遮挡主要工作区）。\n\n## 解决方案\n使用 `tauri-plugin-window-state` 记住位置，首次启动时计算屏幕右下角：\n```rust\n// 获取屏幕尺寸，窗口宽320高520，边距20px\nlet x = screen_width - 320 - 20;\nlet y = screen_height - 520 - 60; // 60px 留给任务栏\n```",
  M3,
  ["ui", "bug"]
);

await createIssue(
  "Add keyboard shortcuts (Enter/Ctrl+N/Esc)",
  "## 快捷键\n- `Enter` — 在 TODO 输入框确认添加\n- `Ctrl+N` — 新建笔记\n- `Esc` — 取消编辑/关闭弹窗\n- `Ctrl+Enter` — 保存笔记\n\n## 实现\n```svelte\n<svelte:window onkeydown={handleGlobalKeys} />\n```",
  M3,
  ["ui"]
);

await createIssue(
  "Fix right-click context menu in text areas",
  "## 问题\nTauri 默认禁用右键菜单，导致用户无法在文本区域复制/粘贴。\n\n## 解决方案\n```json\n// tauri.conf.json\n\"app\": {\n  \"withGlobalTauri\": false,\n  \"windows\": [{ \"useHttpsScheme\": false }]\n}\n```\n或在 Rust 端为文本区域启用右键菜单。",
  M3,
  ["ui", "bug"]
);

await createIssue(
  "Add empty state guidance text",
  "## 需求\n当列表为空时显示友好引导，而非空白区域。\n\n## 每个卡片的空状态\n- TODO: \"🎉 今日待办已清空！点击 + 添加新任务\"\n- 笔记: \"✎ 暂无笔记。按 Ctrl+N 新建\"\n- 工作记录: \"📋 今天还没有工作记录\"\n\n## 实现\n```svelte\n{#if items.length === 0}\n  <div class=\"empty-state\">...</div>\n{/if}\n```",
  M3,
  ["ui"]
);

await createIssue(
  "Add today's date display in work log card header",
  "## 需求\n工作记录卡片顶部显示今日日期（如：2月21日 周五），帮助用户快速定位。\n\n## 实现\n```ts\nconst today = new Intl.DateTimeFormat('zh-CN', {\n  month: 'long', day: 'numeric', weekday: 'short'\n}).format(new Date());\n```",
  M3,
  ["ui"]
);

console.log("\n=== Milestone 4: 数据层优化 ===");
await createIssue(
  "Integrate SQLCipher for AES-256 encrypted SQLite",
  "## 背景\n当前 SQLite 数据库以明文存储，用户数据不安全。\n\n## 解决方案\n使用 SQLCipher（AES-256-CBC）加密整个数据库。\n\n## 密钥派生\n```rust\n// 从设备唯一标识 + 应用 salt 派生密钥\n// 用户无感知，无需输入密码\nlet key = derive_key(machine_id(), APP_SALT);\n```\n\n## 注意\n- 需要替换 `tauri-plugin-sql` 使用 SQLCipher 编译的 rusqlite\n- devcontainer 需要安装 OpenSSL\n\n## 验证\n用十六进制编辑器打开 `.db` 文件，内容应为不可读密文",
  M4,
  ["security", "data-layer"]
);

await createIssue(
  "Implement database migration version system",
  "## 方案\n使用 `PRAGMA user_version` 跟踪 schema 版本。\n\n```typescript\nconst MIGRATIONS = [\n  null,       // v0: initial\n  migrateV1,  // v1: current schema\n  // future: migrateV2, migrateV3...\n];\n\nasync function runMigrations(db) {\n  const [{ user_version }] = await db.select('PRAGMA user_version');\n  for (let v = user_version; v < MIGRATIONS.length; v++) {\n    if (MIGRATIONS[v]) await MIGRATIONS[v](db);\n    await db.execute(`PRAGMA user_version = ${v + 1}`);\n  }\n}\n```\n\n## 要求\n迁移函数必须是幂等的",
  M4,
  ["data-layer"]
);

await createIssue(
  "Implement zstd compression for large text content",
  "## 背景\n笔记和工作记录可能包含大量文本，压缩可显著减少存储占用（预计 60-70%）。\n\n## 实现\n```rust\n// Rust 端: 写入时压缩，读取时解压\nuse zstd;\nlet compressed = zstd::encode_all(content.as_bytes(), 3)?;\n// 存入 BLOB 字段，同时设置 is_compressed = 1\n```\n\n## 阈值\n内容 > 1KB 时才压缩（避免小文本压缩开销）",
  M4,
  ["data-layer"]
);

await createIssue(
  "Implement TODO auto-archive (30-day completed items)",
  "## 需求\n已完成超过 30 天的 TODO 自动迁移到归档表，保持主表轻量。\n\n## 实现\n```sql\n-- 每次启动时运行\nINSERT INTO todos_archive\n  SELECT * FROM todos\n  WHERE is_done = 1\n    AND created_at < (unixepoch() - 30 * 86400) * 1000;\n\nDELETE FROM todos\n  WHERE is_done = 1\n    AND created_at < (unixepoch() - 30 * 86400) * 1000;\n```",
  M4,
  ["data-layer"]
);

await createIssue(
  "Add periodic VACUUM for database space reclaim",
  "## 需求\n定期运行 `INCREMENTAL VACUUM` 回收已删除数据占用的空间。\n\n## 实现\n```rust\n// 每 7 天运行一次（记录上次时间到 plugin-store）\nasync fn maybe_vacuum(db: &Db, store: &Store) {\n    let last_vacuum: i64 = store.get(\"last_vacuum\").await.unwrap_or(0);\n    if now() - last_vacuum > 7 * 86400 {\n        db.execute(\"PRAGMA incremental_vacuum(100)\", []).await?;\n        store.set(\"last_vacuum\", now()).await?;\n    }\n}\n```",
  M4,
  ["data-layer"]
);

await createIssue(
  "Write data layer unit tests",
  "## 测试覆盖\n- SQLCipher 加密验证（DB 文件头不可读）\n- 迁移版本升级流程\n- zstd 压缩/解压正确性\n- TODO 归档逻辑\n- VACUUM 触发条件\n- 输入长度校验\n\n## 覆盖率目标\nRust 核心逻辑 ≥ 80%，前端 store/db ≥ 80%",
  M4,
  ["testing", "data-layer"]
);

console.log("\n=== Milestone 5: 语音功能 ===");
await createIssue(
  "Integrate whisper-rs Rust binding for local voice-to-text",
  "## 背景\n当前设计使用 Web Speech API 将音频发送至 Microsoft Azure，违反隐私优先原则。\n\n## 解决方案\n使用 `whisper-rs`（OpenAI Whisper 的 Rust 绑定），完全本地推理。\n\n```toml\nwhisper-rs = { version = \"0.11\", features = [\"metal\"] }\n```\n\n## 模型\n`ggml-small.bin` (~240MB)，首次使用时引导用户下载。\n\n## 注意\n模型文件不包含在安装包中，按需下载",
  M5,
  ["voice", "security"]
);

await createIssue(
  "Implement Whisper model download on first use",
  "## 流程\n1. 首次点击语音按钮时检测模型文件是否存在\n2. 不存在则弹出下载确认对话框\n3. 显示下载进度条\n4. 下载完成后自动开始录音\n\n## 模型存储路径\n`$APPLOCALDATA/desknote/models/ggml-small.bin`\n\n## 下载地址\nHugging Face: `ggerganov/whisper.cpp` 仓库提供的模型文件",
  M5,
  ["voice"]
);

await createIssue(
  "Implement audio recording → Whisper transcription pipeline",
  "## 流程\n```\n用户点击麦克风 → 开始录音（WebAudio API）→\n停止录音 → PCM 音频传给 Rust IPC →\nwhisper-rs 推理（zh 语言）→\n返回转录文本 → 追加到当前笔记\n```\n\n## IPC 命令\n```rust\n#[tauri::command]\nasync fn transcribe_audio(audio_data: Vec<f32>) -> Result<String, String>\n```\n\n## 语言设置\n`whisper-rs` 设置 `language = \"zh\"`，提高中文准确率",
  M5,
  ["voice"]
);

await createIssue(
  "Frontend voice input UI with recording animation",
  "## UI 需求\n- 麦克风按钮：静止状态、录音中（红色脉冲动画）、处理中（旋转）\n- 录音时显示实时波形（可选）\n- 错误状态：模型未下载、麦克风权限被拒\n\n## Tauri 权限\n需要在 `capabilities/default.json` 添加麦克风访问权限",
  M5,
  ["voice", "ui"]
);

await createIssue(
  "Write voice feature tests",
  "## 测试用例\n```rust\n// Rust 单元测试\n#[test] fn test_audio_format_validation()\n#[test] fn test_model_path_resolution()\n#[test] fn test_transcribe_empty_audio()\n```\n\n```ts\n// 前端测试\ndescribe('VoiceInput', () => {\n  it('should show download prompt when model missing')\n  it('should display recording animation when active')\n  it('should append transcript to current note')\n})\n```",
  M5,
  ["voice", "testing"]
);

console.log("\n=== Milestone 6: 完整功能 Phase 2 ===");
await createIssue(
  "Work log module with date grouping",
  "## 功能\n- 每天一条工作记录（按日期分组显示）\n- 支持 Markdown 格式输入（#标签）\n- 按日期/标签筛选历史\n\n## 数据结构\n```sql\nCREATE TABLE work_logs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  date TEXT NOT NULL,  -- YYYY-MM-DD\n  content BLOB NOT NULL DEFAULT '',\n  is_compressed INTEGER NOT NULL DEFAULT 0,\n  created_at INTEGER NOT NULL\n);\n```",
  M6,
  ["phase-2"]
);

await createIssue(
  "Calendar view (pure Svelte, no third-party calendar library)",
  "## 需求\n纯 Svelte 实现月历视图，显示有工作记录的日期标记。\n\n## 功能\n- 月/周视图切换\n- 点击日期查看当天工作记录\n- TODO 到期日期标记\n\n## 原则\n不引入第三方日历库（维护风险），自行实现约 200 行 Svelte 代码",
  M6,
  ["phase-2", "ui"]
);

await createIssue(
  "Import/Export as .desknote.json",
  "## 功能\n- 导出：所有 TODO + 笔记 + 工作记录导出为 JSON\n- 导入：选择文件，合并或覆盖现有数据\n\n## JSON 格式\n```json\n{\n  \"version\": 1,\n  \"exportedAt\": 1234567890,\n  \"todos\": [...],\n  \"notes\": [...],\n  \"workLogs\": [...]\n}\n```\n\n## 安全\n导入时严格校验 JSON schema，防止注入",
  M6,
  ["phase-2"]
);

await createIssue(
  "Dark/light theme switch",
  "## 需求\n支持跟随系统主题自动切换，也可手动选择。\n\n## 实现\n```svelte\n<!-- 使用 CSS custom properties 实现，已在 app.css 中预留变量 -->\n<script>\n  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');\n</script>\n```\n\n## 状态\n主题偏好保存到 `tauri-plugin-store`",
  M6,
  ["phase-2", "ui"]
);

await createIssue(
  "Card display/hide/sort settings",
  "## 需求\n用户可在设置中控制：\n- 显示哪些卡片（TODO/笔记/工作记录/日历）\n- 卡片顺序（拖拽排序）\n- 各卡片默认展开/折叠状态\n\n## 存储\n配置保存到 `tauri-plugin-store`：\n```json\n{ \"cards\": [\"todo\", \"notes\", \"worklog\"], \"collapsed\": {} }\n```",
  M6,
  ["phase-2", "ui"]
);

console.log("\n=== Milestone 7: 发布准备 ===");
await createIssue(
  "Windows code signing configuration",
  "## 需求\n对 Windows 安装包进行代码签名，避免 SmartScreen 警告。\n\n## 选项\n- **自签名证书**（开发测试）: 生成自签名证书，用户需手动信任\n- **EV 证书**（正式发布）: 购买 EV 证书，无 SmartScreen 警告\n\n## Phase 1 方案\n使用自签名证书，在 README 中说明安装步骤\n\n## GitHub Actions 配置\n```yaml\nenv:\n  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}\n```",
  M7,
  ["release", "security"]
);

await createIssue(
  "Installer optimization (NSIS configuration)",
  "## 目标\nWindows NSIS 安装包 < 8MB（不含 Whisper 模型）\n\n## 优化项\n- `strip = true` (已配置)\n- `lto = true` (已配置)\n- `opt-level = \"s\"` (已配置)\n- 配置 NSIS 压缩级别\n- 移除未使用的 Tauri 功能 feature flags",
  M7,
  ["release"]
);

await createIssue(
  "Multi-monitor window position handling",
  "## 问题\n在多显示器环境下，窗口可能出现在非主显示器或超出屏幕边界。\n\n## 解决方案\n使用 `tauri-plugin-window-state` 记住位置，启动时验证窗口在可见区域内：\n```rust\n// 获取所有显示器，检查窗口位置是否在可见区域\nif !is_on_visible_monitor(&position, &size) {\n    // 重置到主显示器右下角\n}\n```",
  M7,
  ["release", "bug"]
);

await createIssue(
  "E2E tests covering all P0 user flows",
  "## P0 流程（必须 100% 覆盖）\n```ts\n// e2e/todo.spec.ts\ntest('add, complete, delete a todo')\ntest('todos persist after app restart')\n\n// e2e/notes.spec.ts\ntest('create, edit, delete a note')\ntest('notes persist after app restart')\n\n// e2e/worklog.spec.ts\ntest('add work log entry for today')\n\n// e2e/settings.spec.ts\ntest('adjust opacity and verify visual change')\ntest('toggle desktop mode')\n```\n\n## 工具\nPlaywright + Tauri webdriver",
  M7,
  ["testing", "release"]
);

await createIssue(
  "Initialize CHANGELOG.md",
  "## 格式\n遵循 [Keep a Changelog](https://keepachangelog.com) 规范。\n\n```markdown\n# Changelog\n\n## [Unreleased]\n### Added\n- ...\n\n## [0.1.0] - 2024-xx-xx\n### Added\n- TODO list with SQLite persistence\n- Notes editor\n- Windows desktop embedding (always-below)\n- Window transparency control\n- System tray\n```",
  M7,
  ["release"]
);

await createIssue(
  "Improve README with screenshots and installation guide",
  "## 内容\n- 应用截图（卡片网格 UI）\n- Windows 安装步骤（含 WebView2 说明）\n- Codespaces 开发环境说明\n- 功能列表（带截图）\n- 常见问题（FAQ）\n\n## 语言\n中英文双语",
  M7,
  ["release"]
);

await createIssue(
  "Release v0.1.0",
  "## 发布前检查清单\n- [ ] 所有 M1-M7 Issue 已关闭\n- [ ] `cargo audit` 零高危漏洞\n- [ ] `npm audit` 零高危漏洞\n- [ ] Vitest 覆盖率 ≥ 80%（核心逻辑）\n- [ ] E2E 测试全部通过\n- [ ] 内存占用 < 50MB（release 模式）\n- [ ] 安装包 < 8MB（不含 Whisper 模型）\n- [ ] CHANGELOG.md 已更新\n- [ ] README 截图已更新\n- [ ] 代码签名已配置\n\n## 发布步骤\n```bash\ngit tag v0.1.0\ngit push origin v0.1.0\n# GitHub Actions 自动构建并发布\n```",
  M7,
  ["release"]
);

console.log("\n✅ All done! Created 7 milestones and 45 issues.");
console.log(`\nView at: https://github.com/${REPO}/issues`);
console.log(`Milestones: https://github.com/${REPO}/milestones`);
