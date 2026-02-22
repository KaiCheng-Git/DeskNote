<script lang="ts">
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
</script>

<div class="worklog-placeholder">
  <p class="date">{today}</p>
  <p class="coming-soon">工作追踪即将在 Phase 2 实现</p>
  <ul class="feature-list">
    <li>每日工时记录</li>
    <li>任务标签与分类</li>
    <li>工作总结生成</li>
  </ul>
</div>

<style>
  .worklog-placeholder {
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .date {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .coming-soon {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .feature-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .feature-list li {
    font-size: 11px;
    color: var(--text-muted);
    padding-left: 12px;
    position: relative;
  }

  .feature-list li::before {
    content: "·";
    position: absolute;
    left: 2px;
    color: var(--accent);
  }
</style>
