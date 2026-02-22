# DeskNote

一个极轻量的 Windows 桌面便签工具，基于 **Tauri v2 + Svelte 5 + Rust** 构建。

## 功能

- 📌 **桌面置底** — 嵌入桌面背景，不遮挡任何其他窗口
- ☑ **TODO 列表** — 快速添加、完成、删除待办事项
- ✎ **备忘录** — 多笔记管理，支持语音输入（Web Speech API）
- 🎙 **语音转文字** — 中文准确识别，零额外依赖
- ⚙ **透明度调节** — 实时调整窗口透明度
- 🔒 **本地优先** — 数据全部存储在本地 SQLite，零云依赖
- 📤 **导入/导出** — JSON 格式，支持手动多端同步（Phase 2）

## 技术栈

| 层级 | 技术 | 维护方 |
|---|---|---|
| 应用框架 | Tauri v2 | CrabNebula / 社区 |
| 前端 | Svelte 5 | Vercel |
| 后端 | Rust | Mozilla / 社区 |
| 存储 | SQLite (tauri-plugin-sql) | tauri-apps 官方 |
| 透明效果 | window-vibrancy | tauri-apps 官方 |
| 语音识别 | Web Speech API | W3C 标准 |

## 开发（GitHub Codespaces）

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/KaiCheng-Git/DeskNote)

1. 点击上方按钮在 Codespaces 中打开
2. 等待环境自动配置完成（约 3-5 分钟）
3. 运行开发服务器：

```bash
npm run tauri dev
```

## 构建 Windows 安装包

推送到 `main` 分支后，GitHub Actions 自动构建 `.exe` 安装包。

在 [Actions](https://github.com/KaiCheng-Git/DeskNote/actions) 页面下载构建产物。

## 运行要求

- Windows 10/11（需要 WebView2 Runtime，Windows 11 已自带）
- 语音识别需要联网（使用 Azure 语音服务）

## 路线图

- **Phase 1（当前）**：TODO、备忘录、置底、透明度、托盘
- **Phase 2**：工作追踪、日历、语音、导入/导出
- **Phase 3**：iOS / Android 适配

## 许可证

MIT
