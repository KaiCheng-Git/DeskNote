<script lang="ts">
  import "../app.css";
  import TitleBar from "$lib/components/TitleBar.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import TodoList from "$lib/components/TodoList.svelte";
  import NoteEditor from "$lib/components/NoteEditor.svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import { activeTab } from "$lib/stores/settings";
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  onMount(async () => {
    const appWindow = getCurrentWindow();
    // Re-apply desktop mode on focus lost
    appWindow.listen("tauri://focus", async () => {
      // Window gained focus — do nothing
    });
    appWindow.listen("tauri://blur", async () => {
      await invoke("on_focus_lost");
    });
  });
</script>

<div id="app">
  <TitleBar />
  <div class="body">
    <Sidebar />
    <main class="content">
      {#if $activeTab === "todo"}
        <TodoList />
      {:else if $activeTab === "notes"}
        <NoteEditor />
      {:else if $activeTab === "worklog"}
        <div class="placeholder">
          <p>📋 工作追踪</p>
          <p class="sub">即将在 Phase 2 实现</p>
        </div>
      {:else if $activeTab === "settings"}
        <SettingsPanel />
      {/if}
    </main>
  </div>
</div>

<style>
  #app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--text-muted);
    font-size: 13px;
  }

  .sub {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.6;
  }
</style>
