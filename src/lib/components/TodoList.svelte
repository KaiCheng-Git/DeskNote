<script lang="ts">
  import { onMount } from "svelte";
  import {
    todos,
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  } from "../stores/todos";

  let inputValue = "";
  let inputEl: HTMLInputElement;

  onMount(loadTodos);

  async function handleAdd() {
    if (!inputValue.trim()) return;
    await addTodo(inputValue);
    inputValue = "";
    inputEl?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const doneTodos = $derived($todos.filter((t) => t.is_done));
  const pendingTodos = $derived($todos.filter((t) => !t.is_done));
</script>

<div class="todo-panel">
  <!-- Input -->
  <div class="input-row">
    <input
      bind:this={inputEl}
      bind:value={inputValue}
      placeholder="添加待办事项…"
      on:keydown={handleKeydown}
      class="todo-input"
    />
    <button class="add-btn" on:click={handleAdd} title="添加">+</button>
  </div>

  <!-- Pending todos -->
  <div class="todo-list">
    {#if pendingTodos.length === 0}
      <p class="empty">今日无待办，休息一下 ☕</p>
    {/if}

    {#each pendingTodos as todo (todo.id)}
      <div class="todo-item">
        <button
          class="checkbox"
          on:click={() => toggleTodo(todo.id)}
          title="标记完成"
        >
          ○
        </button>
        <span class="todo-text">{todo.content}</span>
        <button
          class="delete-btn"
          on:click={() => deleteTodo(todo.id)}
          title="删除"
        >
          ×
        </button>
      </div>
    {/each}

    <!-- Done todos -->
    {#if doneTodos.length > 0}
      <div class="done-section">
        <span class="done-label">已完成 {doneTodos.length}</span>
        {#each doneTodos as todo (todo.id)}
          <div class="todo-item done">
            <button
              class="checkbox done"
              on:click={() => toggleTodo(todo.id)}
              title="撤销完成"
            >
              ✓
            </button>
            <span class="todo-text">{todo.content}</span>
            <button
              class="delete-btn"
              on:click={() => deleteTodo(todo.id)}
              title="删除"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .todo-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .input-row {
    display: flex;
    align-items: center;
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--border);
    gap: 6px;
    flex-shrink: 0;
  }

  .todo-input {
    flex: 1;
    font-size: 13px;
    padding: 4px 0;
  }

  .add-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent-dim);
    color: var(--accent);
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .add-btn:hover {
    background: var(--accent);
    color: white;
  }

  .todo-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
  }

  .empty {
    text-align: center;
    color: var(--text-muted);
    padding: 24px 12px;
    font-size: 12px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    gap: 8px;
    border-radius: 4px;
    transition: background 0.1s;
  }

  .todo-item:hover {
    background: var(--bg-hover);
  }

  .todo-item:hover .delete-btn {
    opacity: 1;
  }

  .checkbox {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--text-muted);
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .checkbox:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .checkbox.done {
    border-color: var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
  }

  .todo-text {
    flex: 1;
    line-height: 1.4;
    word-break: break-all;
  }

  .todo-item.done .todo-text {
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .delete-btn {
    opacity: 0;
    font-size: 14px;
    color: var(--text-muted);
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .delete-btn:hover {
    background: rgba(233, 69, 96, 0.2);
    color: var(--accent);
  }

  .done-section {
    margin-top: 8px;
    border-top: 1px solid var(--border);
    padding-top: 4px;
  }

  .done-label {
    font-size: 10px;
    color: var(--text-muted);
    padding: 4px 12px;
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
