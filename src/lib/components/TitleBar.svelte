<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { invoke } from "@tauri-apps/api/core";
  import { desktopMode, saveDesktopMode } from "../stores/settings";

  const appWindow = getCurrentWindow();

  async function minimize() {
    await appWindow.minimize();
  }

  async function close() {
    await appWindow.hide();
  }

  async function toggleDesktopMode() {
    const next = !$desktopMode;
    await saveDesktopMode(next);
    if (next) {
      await invoke("send_to_desktop");
    }
  }
</script>

<!-- data-tauri-drag-region makes the div draggable -->
<div class="titlebar" data-tauri-drag-region>
  <span class="app-name" data-tauri-drag-region>DeskNote</span>

  <div class="controls">
    <button
      class="control-btn pin"
      class:active={$desktopMode}
      title={$desktopMode ? "取消置底模式" : "置底到桌面背景"}
      on:click={toggleDesktopMode}
    >
      📌
    </button>
    <button class="control-btn" title="最小化" on:click={minimize}>─</button>
    <button class="control-btn close" title="隐藏到托盘" on:click={close}>×</button>
  </div>
</div>

<style>
  .titlebar {
    height: var(--titlebar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 0 12px;
    border-bottom: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.03);
    flex-shrink: 0;
  }

  .app-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .controls {
    display: flex;
    gap: 2px;
  }

  .control-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
  }

  .control-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .control-btn.pin.active {
    color: var(--accent);
  }

  .control-btn.close:hover {
    background: rgba(233, 69, 96, 0.2);
    color: var(--accent);
  }
</style>
