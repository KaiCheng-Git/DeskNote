<script lang="ts">
  import { activeTab, type TabId } from "../stores/settings";

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: "todo", icon: "☑", label: "待办" },
    { id: "notes", icon: "✎", label: "笔记" },
    { id: "worklog", icon: "📋", label: "工作" },
    { id: "settings", icon: "⚙", label: "设置" },
  ];

  function select(id: TabId) {
    activeTab.set(id);
  }
</script>

<nav class="sidebar">
  {#each tabs as tab}
    <button
      class="tab-btn"
      class:active={$activeTab === tab.id}
      title={tab.label}
      on:click={() => select(tab.id)}
    >
      <span class="icon">{tab.icon}</span>
    </button>
  {/each}
</nav>

<style>
  .sidebar {
    width: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    border-right: 1px solid var(--border);
    background: rgba(0, 0, 0, 0.1);
    gap: 4px;
    flex-shrink: 0;
  }

  .tab-btn {
    width: 34px;
    height: 34px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 16px;
    transition: background 0.15s, color 0.15s;
  }

  .tab-btn:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .tab-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .icon {
    line-height: 1;
  }
</style>
