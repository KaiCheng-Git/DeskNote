<script lang="ts">
  import "../app.css";
  import TitleBar from "$lib/components/TitleBar.svelte";
  import TodoList from "$lib/components/TodoList.svelte";
  import NoteEditor from "$lib/components/NoteEditor.svelte";
  import WorkLogCard from "$lib/components/WorkLogCard.svelte";
  import SettingsPanel from "$lib/components/SettingsPanel.svelte";
  import { cardCollapsed, saveCardCollapsed, loadSettings } from "$lib/stores/settings";
  import { notes, createNote } from "$lib/stores/notes";
  import { todos } from "$lib/stores/todos";
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let unlisten: (() => void) | undefined;

  onMount(async () => {
    await loadSettings();
    const appWindow = getCurrentWindow();
    unlisten = await appWindow.listen("tauri://blur", async () => {
      await invoke("on_focus_lost");
    });
  });

  onDestroy(() => {
    unlisten?.();
  });

  function toggleCard(id: string) {
    const next = { ...$cardCollapsed, [id]: !$cardCollapsed[id] };
    saveCardCollapsed(next);
  }

  async function handleGlobalKeydown(e: KeyboardEvent) {
    // Ctrl+N: new note, expand notes card
    if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
      e.preventDefault();
      const next = { ...$cardCollapsed, notes: false };
      saveCardCollapsed(next);
      await createNote();
    }
  }

  const pendingCount = $derived($todos.filter((t) => !t.is_done).length);
  const noteCount = $derived($notes.length);
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div id="app">
  <TitleBar />
  <div class="card-area">

    <!-- ─── Todo Card ───────────────────────────────────────── -->
    <div class="card">
      <button
        class="card-header"
        on:click={() => toggleCard("todo")}
        title="展开/折叠"
      >
        <span class="card-icon">☐</span>
        <span class="card-title">待办</span>
        {#if pendingCount > 0}
          <span class="card-badge">{pendingCount}</span>
        {/if}
        <span class="card-toggle">{$cardCollapsed["todo"] ? "▸" : "▾"}</span>
      </button>
      {#if !$cardCollapsed["todo"]}
        <div class="card-body">
          <TodoList />
        </div>
      {/if}
    </div>

    <!-- ─── Notes Card ──────────────────────────────────────── -->
    <div class="card">
      <button
        class="card-header"
        on:click={() => toggleCard("notes")}
        title="展开/折叠  Ctrl+N 新建笔记"
      >
        <span class="card-icon">✎</span>
        <span class="card-title">笔记</span>
        {#if noteCount > 0}
          <span class="card-badge">{noteCount}</span>
        {/if}
        <span class="card-toggle">{$cardCollapsed["notes"] ? "▸" : "▾"}</span>
      </button>
      {#if !$cardCollapsed["notes"]}
        <div class="card-body card-body--tall">
          <NoteEditor />
        </div>
      {/if}
    </div>

    <!-- ─── Work Log Card ───────────────────────────────────── -->
    <div class="card">
      <button
        class="card-header"
        on:click={() => toggleCard("worklog")}
        title="展开/折叠"
      >
        <span class="card-icon">📋</span>
        <span class="card-title">工作追踪</span>
        <span class="card-toggle">{$cardCollapsed["worklog"] ? "▸" : "▾"}</span>
      </button>
      {#if !$cardCollapsed["worklog"]}
        <div class="card-body">
          <WorkLogCard />
        </div>
      {/if}
    </div>

    <!-- ─── Settings Card ───────────────────────────────────── -->
    <div class="card">
      <button
        class="card-header"
        on:click={() => toggleCard("settings")}
        title="展开/折叠"
      >
        <span class="card-icon">⚙</span>
        <span class="card-title">设置</span>
        <span class="card-toggle">{$cardCollapsed["settings"] ? "▸" : "▾"}</span>
      </button>
      {#if !$cardCollapsed["settings"]}
        <div class="card-body">
          <SettingsPanel />
        </div>
      {/if}
    </div>

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

  .card-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 6px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .card-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    text-align: left;
    color: var(--text-secondary);
    font-size: 12px;
    transition: background 0.12s, color 0.12s;
    border-radius: 6px;
  }

  .card-header:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .card-icon {
    font-size: 13px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  .card-title {
    flex: 1;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .card-badge {
    font-size: 10px;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: 8px;
    padding: 1px 6px;
    flex-shrink: 0;
  }

  .card-toggle {
    font-size: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .card-body {
    border-top: 1px solid var(--border);
    max-height: 220px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Notes card gets more vertical space */
  .card-body--tall {
    max-height: 300px;
  }
</style>
