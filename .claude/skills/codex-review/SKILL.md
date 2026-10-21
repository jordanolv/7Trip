---
name: codex-review
description: Before proposing or doing a merge of a 7Trip PR, read and handle every Codex (ChatGPT) review comment on it. Use whenever a PR is opened/pushed, when the user OKs a merge, or when asked to check the GPT/Codex review.
---

# Codex review gate

Codex (`chatgpt-codex-connector[bot]`) reviews every PR automatically, a few minutes after each push.
A PR is **not mergeable** until its Codex review covers the head commit and every comment is handled.

## Steps

1. Run `.claude/skills/codex-review/codex-comments.sh <pr>` from the repo root.
   - "no review yet" or "NOT the head": Codex is still working. Wait (a few minutes) and re-run; do not merge.
2. For each `[OPEN]` comment, check the claim against the code yourself. Codex is often right but not always
   (e.g. it assumes the Expo web target is in scope; the guest web app is a separate, later step).
   - **Valid**: fix it on the PR branch (add a test when the bug is testable), push, and go back to step 1
     once the new review lands.
   - **Not applicable / already handled**: say why.
3. Reply in each thread so it shows `[answered]`, in French, one or two sentences:
   `gh api repos/{owner}/{repo}/pulls/<pr>/comments/<id>/replies -f body="Corrigé dans <sha> : …"`
   (or `Non retenu : <raison>`).
4. When telling the user what to test, add a short "Retours Codex" list: each finding, fixed or not, and why.
   Only merge after the user's explicit OK **and** a clean step 1 (no `[OPEN]`, review on the head).
