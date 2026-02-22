<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    notes,
    activeNoteId,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
  } from "../stores/notes";

  let title = "";
  let content = "";
  let saveTimeout: ReturnType<typeof setTimeout>;

  onMount(loadNotes);

  // Sync to active note — cancel any pending save first to prevent
  // a scheduled save from writing to the wrong note after switching
  $effect(() => {
    const id = $activeNoteId;
    const note = $notes.find((n) => n.id === id);
    clearTimeout(saveTimeout);
    if (note) {
      title = note.title;
      content = note.content;
    } else {
      title = "";
      content = "";
    }
  });

  function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if ($activeNoteId) {
        try {
          await updateNote($activeNoteId, title, content);
        } catch {
          // Validation or DB error — surfaced in M4 error handling milestone
        }
      }
    }, 500);
  }

  // Voice recognition
  let isListening = false;
  let recognition: SpeechRecognition | null = null;

  function toggleVoice() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("当前环境不支持语音识别");
      return;
    }
    if (isListening) {
      recognition?.stop();
      isListening = false;
      return;
    }
    recognition = new SR();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      content = content ? content + "\n" + text : text;
      scheduleSave();
    };
    recognition.onerror = () => {
      isListening = false;
    };
    recognition.onend = () => {
      isListening = false;
    };
    recognition.start();
    isListening = true;
  }

  // Clean up on component destroy: cancel pending save + stop any active recognition
  onDestroy(() => {
    clearTimeout(saveTimeout);
    recognition?.abort();
  });
</script>

<div class="notes-panel">
  <!-- Notes list -->
  <div class="notes-list">
    <button class="new-note-btn" on:click={createNote} title="新建笔记">
      + 新建
    </button>
    {#each $notes as note (note.id)}
      <button
        class="note-item"
        class:active={$activeNoteId === note.id}
        on:click={() => activeNoteId.set(note.id)}
      >
        <span class="note-title">{note.title || "无标题"}</span>
        <button
          class="note-delete"
          on:click|stopPropagation={() => deleteNote(note.id)}
          title="删除"
        >
          ×
        </button>
      </button>
    {/each}
  </div>

  <!-- Editor -->
  {#if $activeNoteId}
    <div class="editor">
      <input
        class="note-title-input"
        bind:value={title}
        placeholder="标题"
        on:input={scheduleSave}
      />
      <div class="editor-toolbar">
        <button
          class="voice-btn"
          class:listening={isListening}
          on:click={toggleVoice}
          title={isListening ? "停止录音" : "语音输入"}
        >
          {isListening ? "⏹ 停止" : "🎙 语音"}
        </button>
      </div>
      <textarea
        class="note-content"
        bind:value={content}
        placeholder="开始记录…"
        on:input={scheduleSave}
      />
    </div>
  {:else}
    <div class="empty-editor">
      <p>点击「+ 新建」创建笔记</p>
    </div>
  {/if}
</div>

<style>
  .notes-panel {
    display: flex;
    height: 100%;
    overflow: hidden;
  }

  .notes-list {
    width: 110px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
    padding: 6px 0;
  }

  .new-note-btn {
    margin: 0 6px 4px;
    padding: 5px 8px;
    border-radius: 5px;
    font-size: 12px;
    color: var(--accent);
    background: var(--accent-dim);
    text-align: center;
    transition: background 0.15s;
  }

  .new-note-btn:hover {
    background: rgba(233, 69, 96, 0.35);
  }

  .note-item {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    margin: 0 4px;
    text-align: left;
    gap: 4px;
    transition: background 0.1s;
  }

  .note-item:hover {
    background: var(--bg-hover);
  }

  .note-item.active {
    background: var(--bg-active);
  }

  .note-item:hover .note-delete {
    opacity: 1;
  }

  .note-title {
    flex: 1;
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-item.active .note-title {
    color: var(--text-primary);
  }

  .note-delete {
    opacity: 0;
    font-size: 13px;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: opacity 0.15s, color 0.15s;
  }

  .note-delete:hover {
    color: var(--accent);
  }

  .editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .note-title-input {
    padding: 10px 12px 6px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .editor-toolbar {
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .voice-btn {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .voice-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
  }

  .voice-btn.listening {
    background: rgba(233, 69, 96, 0.2);
    color: var(--accent);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .note-content {
    flex: 1;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.6;
    overflow-y: auto;
    color: var(--text-primary);
    user-select: text;
  }

  .empty-editor {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
