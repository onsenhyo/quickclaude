# quickclaude Improvements Design

## Overview

Seven improvements to quickclaude addressing performance, reliability, UX, and maintainability.

## 1. `resolvePath` Performance

**Problem:** Greedy longest-match tries all segment lengths in reverse, calling `existsSync` for each combination. Theoretical worst-case is factorial in segment count.

**Solution:** Cache matched path segments to avoid redundant `existsSync` calls. The greedy approach stays the same — it's correct — but repeated lookups for the same prefix are eliminated.

## 2. Publish Workflow: Tag-Based Trigger

**Problem:** Current workflow runs `npm publish` on every push to `main`. Fails if version hasn't changed.

**Solution:** Change trigger from `on: push → branches: main` to `on: push → tags: 'v*'`. Publish only runs when a version tag is pushed (e.g., `git tag v1.2.0 && git push --tags`).

## 3. Error Handling

**Problem:** No user-facing error messages when `claude` is not installed or spawn fails.

**Solution:**
- Before spawning, check if `claude` exists on PATH using `execFileSync("which", ["claude"])` (or platform equivalent)
- If not found, print a clear message: "Claude Code is not installed" with install instructions
- Add `error` event handler on the spawned child process

## 4. Tests with `node:test`

**Problem:** No tests exist. `resolvePath` has many edge cases that are easy to break.

**Solution:** Use Node.js built-in `node:test` (zero dependencies, Node 18+).

**Test files:**
- `test/resolvePath.test.js` — normal paths, hyphenated dirs, spaces, Windows drives, non-existent paths
- `test/timeAgo.test.js` — boundary values for each time unit
- `test/getProjects.test.js` — filtering logic (worktrees, non-existent paths)

**Module restructure:** Extract `resolvePath`, `timeAgo`, `getProjectLabel`, `getProjects` into importable functions. Keep `main()` as the CLI entry point. The simplest approach: add named exports alongside the existing CLI execution, guarded by an `import.meta.url` check.

## 5. Replace `@clack/prompts` with `prompts`

**Problem:** `@clack/prompts` `select` does not support type-to-filter. With many projects, finding the right one is slow.

**Solution:** Switch to `prompts` library, using its `autocomplete` prompt type. User types to filter projects by path. Display format (relative time + path) stays the same.

## 6. Remove `shell: true`

**Problem:** `spawn("claude", args, { shell: true })` passes arguments through the shell, risking unintended shell expansion.

**Solution:** Remove `shell: true`. Use `spawn("claude", args, { cwd: selected, stdio: "inherit" })`.

## 7. Improved mtime Accuracy

**Problem:** Using the project directory's own `mtime` which only updates when directory entries change, not when files inside are modified.

**Solution:** Read files inside `~/.claude/projects/<dir>/` and use the most recent file `mtime` as the project's last-used time. This reflects actual Claude Code usage since Claude updates files in this directory during sessions.

## Scope

All changes are within a single file (`bin/quickclaude.js`) plus new test files and workflow update. No new runtime dependencies beyond replacing `@clack/prompts` with `prompts`.

## Testing Strategy

- Unit tests for pure functions (`resolvePath`, `timeAgo`) with mock filesystem where needed
- Integration test for `getProjects` with a temporary directory structure
- Manual verification of `autocomplete` UX
- `npm test` script added to `package.json`
