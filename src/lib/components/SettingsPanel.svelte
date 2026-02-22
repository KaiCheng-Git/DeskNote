<script lang="ts">
  import { onMount } from "svelte";
  import { opacity, desktopMode, loadSettings, saveOpacity, saveDesktopMode } from "../stores/settings";
  import { invoke } from "@tauri-apps/api/core";

  onMount(loadSettings);

  async function handleOpacityChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    await saveOpacity(val);
    // Apply opacity to window body
    document.getElementById("app")!.style.opacity = String(val);
  }

  async function handleDesktopMode(e: Event) {
    const val = (e.target as HTMLInputElement).checked;
    await saveDesktopMode(val);
    if (val) await invoke("send_to_desktop");
  }
</script>

<div class="settings-panel">
  <h3 class="section-title">外观</h3>

  <div class="setting-row">
    <label>
      <span>透明度</span>
      <span class="value">{Math.round($opacity * 100)}%</span>
    </label>
    <input
      type="range"
      min="0.3"
      max="1"
      step="0.05"
      value={$opacity}
      on:input={handleOpacityChange}
      class="slider"
    />
  </div>

  <h3 class="section-title" style="margin-top:16px">桌面行为</h3>

  <div class="setting-row toggle-row">
    <div>
      <span>置底模式</span>
      <span class="hint">沉入桌面背景，不遮挡其他窗口</span>
    </div>
    <label class="toggle">
      <input
        type="checkbox"
        checked={$desktopMode}
        on:change={handleDesktopMode}
      />
      <span class="slider-toggle"></span>
    </label>
  </div>

  <div class="setting-row toggle-row">
    <div>
      <span>关闭时隐藏到托盘</span>
      <span class="hint">点击 × 不退出，保留在系统托盘</span>
    </div>
    <span class="badge">已启用</span>
  </div>

  <h3 class="section-title" style="margin-top:16px">关于</h3>
  <div class="about">
    <p>DeskNote v0.1.0</p>
    <p class="text-muted">Tauri v2 · Svelte 5 · Rust</p>
    <a
      href="https://github.com/KaiCheng-Git/DeskNote"
      target="_blank"
      class="link"
    >
      GitHub 源码
    </a>
  </div>
</div>

<style>
  .settings-panel {
    padding: 12px;
    overflow-y: auto;
    height: 100%;
  }

  .section-title {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .setting-row {
    margin-bottom: 10px;
  }

  .setting-row label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .value {
    color: var(--accent);
    font-size: 11px;
  }

  .slider {
    width: 100%;
    accent-color: var(--accent);
    height: 3px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }

  .toggle-row > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .toggle-row span:first-child {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .hint {
    font-size: 10px;
    color: var(--text-muted) !important;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    flex-shrink: 0;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider-toggle {
    position: absolute;
    inset: 0;
    background: var(--border);
    border-radius: 18px;
    transition: 0.2s;
    cursor: pointer;
  }

  .slider-toggle::before {
    content: "";
    position: absolute;
    width: 12px;
    height: 12px;
    left: 3px;
    top: 3px;
    border-radius: 50%;
    background: white;
    transition: 0.2s;
  }

  input:checked + .slider-toggle {
    background: var(--accent);
  }

  input:checked + .slider-toggle::before {
    transform: translateX(14px);
  }

  .badge {
    font-size: 10px;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 2px 6px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .about {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .about p {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .link {
    font-size: 11px;
    color: var(--accent);
    text-decoration: none;
    margin-top: 4px;
  }

  .link:hover {
    text-decoration: underline;
  }
</style>
