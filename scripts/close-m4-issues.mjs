/**
 * Closes GitHub issues for completed M4 work:
 *   #24 DB migration system
 *   #26 TODO auto-archive (30 days)
 *   #27 Periodic VACUUM
 *   #28 Data layer unit tests
 *
 * Skipped (deferred to later milestone):
 *   #23 SQLCipher  — complex key management
 *   #25 zstd       — premature optimisation for current data sizes
 *
 * Run: node scripts/close-m4-issues.mjs <GITHUB_TOKEN>
 */
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error("Usage: node scripts/close-m4-issues.mjs <GITHUB_TOKEN>");
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

const issues = [24, 26, 27, 28];

for (const num of issues) {
  const res = await fetch(`${BASE}/issues/${num}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ state: "closed" }),
  });
  const ok = res.ok ? "✓" : "✗";
  console.log(`${ok} Issue #${num} — ${res.status}`);
}
