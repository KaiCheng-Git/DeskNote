/**
 * Closes GitHub issues #19-#25 (M3 completion).
 * Run: node scripts/close-m3-issues.mjs <GITHUB_TOKEN>
 */
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error("Usage: node scripts/close-m3-issues.mjs <GITHUB_TOKEN>");
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

const issues = [19, 20, 21, 22, 23, 24, 25];

for (const num of issues) {
  const res = await fetch(`${BASE}/issues/${num}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ state: "closed" }),
  });
  const ok = res.ok ? "✓" : "✗";
  console.log(`${ok} Issue #${num} — ${res.status}`);
}
