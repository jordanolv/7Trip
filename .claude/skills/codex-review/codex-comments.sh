#!/usr/bin/env bash
# Usage: codex-comments.sh <pr-number>
# Prints the Codex review state for the PR head and every Codex inline comment, with whether it was answered.
set -euo pipefail
pr="$1"
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
bot='chatgpt-codex-connector[bot]'
head=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)

state=$(gh api "repos/$repo/issues/$pr/comments" --paginate \
  --jq "[.[] | select(.user.login==\"$bot\") | .body | capture(\"codex-review-state:v1 (?<s>\\\\{.*\\\\}) -->\").s] | last // empty")
echo "PR #$pr head: ${head:0:7}"
if [ -z "$state" ]; then
  echo "Codex: no review yet"
else
  echo "$state" | jq -r --arg head "$head" '.code_review | "Codex: \(.status) on \(.commit_sha[0:7])\(if .commit_sha == $head then " (= head)" else " (NOT the head: wait for the new review)" end), unresolved findings: \(.has_unresolved_findings)"'
fi
echo

gh api "repos/$repo/pulls/$pr/comments" --paginate --jq '.' | jq -s 'add // []' | jq -r --arg bot "$bot" '
  (map(select(.in_reply_to_id != null) | .in_reply_to_id) | unique) as $answered
  | map(select(.user.login == $bot and .in_reply_to_id == null))
  | if length == 0 then "No Codex inline comments." else .[] |
    "#\(.id) \(if (.id as $id | $answered | index($id)) then "[answered]" else "[OPEN]" end) \(.path):\(.line // .original_line) @\(.commit_id[0:7])\n"
    + (.body | gsub("<[^>]+>"; "") | gsub("!\\[[^]]*\\]\\([^)]*\\)"; "") | gsub("\n\nUseful\\? React with[^\n]*"; "") | gsub("^\\s+"; ""))
    + "\n" end'
