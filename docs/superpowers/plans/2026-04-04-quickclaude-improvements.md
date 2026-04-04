# quickclaude Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve quickclaude across 7 areas: performance, reliability, testing, UX, and CI.

**Architecture:** Single-file CLI stays in `bin/quickclaude.js` with named exports for testability. Functions are guarded by `import.meta.url` check so the file works as both a CLI entry point and an importable module. Tests use `node:test` with temp directories.

**Tech Stack:** Node.js 18+, `node:test`, `prompts` (replaces `@clack/prompts`), GitHub Actions

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `bin/quickclaude.js` | Modify | CLI entry point + all functions (add exports, optimize resolvePath, mtime, error handling, prompts migration, remove shell:true) |
| `test/resolvePath.test.js` | Create | Unit tests for resolvePath with temp directory fixtures |
| `test/timeAgo.test.js` | Create | Unit tests for timeAgo boundary values |
| `test/getProjects.test.js` | Create | Integration tests for getProjects with temp directory fixtures |
| `package.json` | Modify | Replace `@clack/prompts` with `prompts`, add `test` script |
| `.github/workflows/publish.yml` | Modify | Tag-based trigger |

---

### Task 1: Module restructure + test infrastructure

**Files:**
- Modify: `bin/quickclaude.js:1-139`
- Modify: `package.json`

- [ ] **Step 1: Add exports and main guard to quickclaude.js**

Add `fileURLToPath` import at line 5, add named exports, and guard `main()`:

```js
// Add to imports at top:
import { fileURLToPath } from "url";

// Replace the bare `main();` at line 139 with:
export { resolvePath, timeAgo, getProjectLabel, getProjects };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 2: Add test script to package.json**

Add to the `"scripts"` section:

```json
"scripts": {
  "start": "node bin/quickclaude.js",
  "test": "node --test test/"
}
```

- [ ] **Step 3: Create a smoke test to verify the setup**

Create `test/timeAgo.test.js` with one basic test:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../bin/quickclaude.js";

describe("timeAgo", () => {
  it("returns 'just now' for current time", () => {
    assert.equal(timeAgo(Date.now()), "just now");
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test`
Expected: 1 test passes

- [ ] **Step 5: Verify CLI still works**

Run: `node bin/quickclaude.js --help` (or just run and Ctrl+C)
Expected: Interactive menu appears normally

- [ ] **Step 6: Commit**

```bash
git add bin/quickclaude.js package.json test/timeAgo.test.js
git commit -m "refactor: add exports and test infrastructure"
```

---

### Task 2: timeAgo tests

**Files:**
- Modify: `test/timeAgo.test.js`

- [ ] **Step 1: Write comprehensive timeAgo tests**

Replace `test/timeAgo.test.js` with:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../bin/quickclaude.js";

describe("timeAgo", () => {
  function msAgo(ms) {
    return Date.now() - ms;
  }

  it("returns 'just now' for <60 seconds ago", () => {
    assert.equal(timeAgo(msAgo(0)), "just now");
    assert.equal(timeAgo(msAgo(30_000)), "just now");
    assert.equal(timeAgo(msAgo(59_000)), "just now");
  });

  it("returns minutes for 1-59 minutes ago", () => {
    assert.equal(timeAgo(msAgo(60_000)), "1m ago");
    assert.equal(timeAgo(msAgo(30 * 60_000)), "30m ago");
    assert.equal(timeAgo(msAgo(59 * 60_000)), "59m ago");
  });

  it("returns hours for 1-23 hours ago", () => {
    assert.equal(timeAgo(msAgo(60 * 60_000)), "1h ago");
    assert.equal(timeAgo(msAgo(12 * 60 * 60_000)), "12h ago");
    assert.equal(timeAgo(msAgo(23 * 60 * 60_000)), "23h ago");
  });

  it("returns days for 1-6 days ago", () => {
    assert.equal(timeAgo(msAgo(24 * 60 * 60_000)), "1d ago");
    assert.equal(timeAgo(msAgo(6 * 24 * 60 * 60_000)), "6d ago");
  });

  it("returns weeks for 7-27 days ago", () => {
    assert.equal(timeAgo(msAgo(7 * 24 * 60 * 60_000)), "1w ago");
    assert.equal(timeAgo(msAgo(21 * 24 * 60 * 60_000)), "3w ago");
  });

  it("returns months for 28+ days ago", () => {
    assert.equal(timeAgo(msAgo(30 * 24 * 60 * 60_000)), "1mo ago");
    assert.equal(timeAgo(msAgo(90 * 24 * 60 * 60_000)), "3mo ago");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add test/timeAgo.test.js
git commit -m "test: add comprehensive timeAgo unit tests"
```

---

### Task 3: resolvePath performance optimization + tests

**Files:**
- Modify: `bin/quickclaude.js:15-51` (resolvePath function)
- Create: `test/resolvePath.test.js`

- [ ] **Step 1: Write resolvePath tests**

Create `test/resolvePath.test.js`:

```js
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolvePath } from "../bin/quickclaude.js";

describe("resolvePath", () => {
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), "qc-test-"));
    // Create directory structure:
    // root/Users/test/projects/my-app/
    // root/Users/test/projects/mcp-overwatch/
    // root/Users/test/My Documents/
    mkdirSync(join(root, "Users", "test", "projects", "my-app"), { recursive: true });
    mkdirSync(join(root, "Users", "test", "projects", "mcp-overwatch"), { recursive: true });
    mkdirSync(join(root, "Users", "test", "My Documents"), { recursive: true });
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("resolves a simple path", () => {
    const encoded = "-Users-test-projects-my-app";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "projects", "my-app"));
  });

  it("resolves hyphenated directory names", () => {
    const encoded = "-Users-test-projects-mcp-overwatch";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "projects", "mcp-overwatch"));
  });

  it("resolves space-separated directory names", () => {
    const encoded = "-Users-test-My-Documents";
    assert.equal(resolvePath(encoded, root), join(root, "Users", "test", "My Documents"));
  });

  it("returns null for non-existent paths", () => {
    const encoded = "-Users-test-nonexistent";
    assert.equal(resolvePath(encoded, root), null);
  });

  it("returns null for empty input", () => {
    assert.equal(resolvePath("", root), null);
  });
});
```

- [ ] **Step 2: Add `root` parameter to resolvePath**

In `bin/quickclaude.js`, change the function signature:

```js
function resolvePath(encoded, root = sep) {
  const parts = encoded.replace(/^-/, "").split("-");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) return null;
  let current = root;
  let i = 0;
```

Also change the Windows drive check to only apply when using default root:

```js
  // Windows: "C--Users-..." → drive letter "C:" 처리
  if (root === sep && parts.length >= 1 && /^[A-Za-z]$/.test(parts[0])) {
    const drive = parts[0].toUpperCase() + ":\\";
    if (existsSync(drive)) {
      current = drive;
      i = 1;
    }
  }
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test`
Expected: resolvePath tests pass (the logic is already correct, we just made it testable)

- [ ] **Step 4: Optimize resolvePath with readdirSync**

Replace the inner while loop in `resolvePath`. Instead of calling `existsSync` for each candidate, read the directory once and check against a Set:

```js
  while (i < parts.length) {
    let entries;
    try {
      entries = new Set(readdirSync(current));
    } catch {
      return null;
    }

    let matched = false;
    for (let len = parts.length - i; len >= 1; len--) {
      const segment = parts.slice(i, i + len);
      for (const joiner of ["-", " "]) {
        const candidate = segment.join(joiner);
        if (entries.has(candidate)) {
          current = join(current, candidate);
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) return null;
  }
```

Note: also add `readdirSync` to the import if not already present (it is — line 4 already imports it).

- [ ] **Step 5: Run tests again**

Run: `npm test`
Expected: All tests still pass

- [ ] **Step 6: Commit**

```bash
git add bin/quickclaude.js test/resolvePath.test.js
git commit -m "perf: optimize resolvePath with readdirSync + add tests"
```

---

### Task 4: mtime accuracy improvement

**Files:**
- Modify: `bin/quickclaude.js:53-77` (getProjects function)

- [ ] **Step 1: Write test for getLatestMtime**

Add to `test/getProjects.test.js`:

```js
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getLatestMtime } from "../bin/quickclaude.js";

describe("getLatestMtime", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "qc-mtime-"));
    // Create files with different mtimes
    writeFileSync(join(dir, "old.md"), "old");
    writeFileSync(join(dir, "new.md"), "new");
    // Set old.md to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 3600_000);
    utimesSync(join(dir, "old.md"), oneHourAgo, oneHourAgo);
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns the most recent file mtime in a directory", () => {
    const latest = getLatestMtime(dir);
    // new.md was just created, so latest should be very recent
    assert.ok(Date.now() - latest < 5000);
  });

  it("ignores subdirectories, only checks direct files", () => {
    mkdirSync(join(dir, "subdir"));
    const latest = getLatestMtime(dir);
    assert.ok(latest > 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `getLatestMtime` is not exported / doesn't exist

- [ ] **Step 3: Implement getLatestMtime and update getProjects**

Add the new function in `bin/quickclaude.js` (before `getProjects`):

```js
function getLatestMtime(dirPath) {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    let latest = 0;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const mtime = statSync(join(dirPath, entry.name)).mtimeMs;
      if (mtime > latest) latest = mtime;
    }
    return latest || statSync(dirPath).mtimeMs;
  } catch {
    return statSync(dirPath).mtimeMs;
  }
}
```

Update `getProjects` to use it. Replace the mtime line:

```js
    .map((p) => {
      const projectDir = join(CLAUDE_PROJECTS_DIR, p.dirName);
      const mtime = getLatestMtime(projectDir);
      return { ...p, mtime };
    })
```

Add `getLatestMtime` to the export statement:

```js
export { resolvePath, timeAgo, getProjectLabel, getProjects, getLatestMtime };
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add bin/quickclaude.js test/getProjects.test.js
git commit -m "fix: use file mtime for accurate project recency"
```

---

### Task 5: Error handling

**Files:**
- Modify: `bin/quickclaude.js:100-137` (main function)

- [ ] **Step 1: Add claude existence check before spawn**

In the `main()` function, after the `p.outro(...)` line (or its replacement) and before the `spawn(...)` call, add:

```js
  const whichCmd = process.platform === "win32" ? "where" : "which";
  try {
    execFileSync(whichCmd, ["claude"], { stdio: "ignore" });
  } catch {
    console.error(
      "Error: Claude Code is not installed.\n" +
      "Install it with: npm install -g @anthropic-ai/claude-code"
    );
    process.exit(1);
  }
```

Add `execFileSync` to the imports (replace `execSync` since it's unused):

```js
import { execFileSync, spawn } from "child_process";
```

- [ ] **Step 2: Add spawn error handler**

After the existing `child.on("exit", ...)`, add:

```js
  child.on("error", (err) => {
    console.error(`Failed to launch Claude: ${err.message}`);
    process.exit(1);
  });
```

- [ ] **Step 3: Test manually**

Run: `node bin/quickclaude.js` — should work normally.
Temporarily rename `claude` or test with a non-existent command to verify the error message.

- [ ] **Step 4: Commit**

```bash
git add bin/quickclaude.js
git commit -m "feat: add error handling for missing claude installation"
```

---

### Task 6: Replace @clack/prompts with prompts

**Files:**
- Modify: `bin/quickclaude.js:1-3, 100-125` (imports and main function)
- Modify: `package.json`

- [ ] **Step 1: Swap dependencies**

```bash
npm uninstall @clack/prompts
npm install prompts
```

- [ ] **Step 2: Update imports in quickclaude.js**

Replace line 3:

```js
// Remove: import * as p from "@clack/prompts";
// Add:
import prompts from "prompts";
```

- [ ] **Step 3: Rewrite the main function UI**

Replace the entire `main()` function body with:

```js
async function main() {
  console.log("\n  quickclaude\n");

  const projects = getProjects();

  if (projects.length === 0) {
    console.error("  No Claude projects found.\n");
    process.exit(1);
  }

  const choices = projects.map((proj) => ({
    title: getProjectLabel(proj.path, proj.mtime),
    value: proj.path,
  }));

  const response = await prompts({
    type: "autocomplete",
    name: "project",
    message: "Select a project",
    choices,
    suggest: (input, choices) =>
      Promise.resolve(
        choices.filter((c) =>
          c.title.toLowerCase().includes(input.toLowerCase())
        )
      ),
  });

  if (!response.project) {
    console.log("  Cancelled\n");
    process.exit(0);
  }

  const args = process.argv.slice(2);

  const whichCmd = process.platform === "win32" ? "where" : "which";
  try {
    execFileSync(whichCmd, ["claude"], { stdio: "ignore" });
  } catch {
    console.error(
      "Error: Claude Code is not installed.\n" +
      "Install it with: npm install -g @anthropic-ai/claude-code"
    );
    process.exit(1);
  }

  console.log(`  Launching Claude in ${response.project}\n`);

  const child = spawn("claude", args, {
    cwd: response.project,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error(`Failed to launch Claude: ${err.message}`);
    process.exit(1);
  });
}
```

Note: this step also includes Task 5 error handling and Task 7 `shell: true` removal (since we're rewriting the function anyway).

- [ ] **Step 4: Run and verify**

Run: `node bin/quickclaude.js`
Expected: Interactive autocomplete menu appears. Type to filter projects. Select one and claude launches.

- [ ] **Step 5: Commit**

```bash
git add bin/quickclaude.js package.json package-lock.json
git commit -m "feat: replace @clack/prompts with prompts for search support

Adds type-to-filter autocomplete when selecting projects.
Also removes shell:true from spawn for safety."
```

---

### Task 7: Tag-based publish workflow

**Files:**
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Update workflow trigger**

Replace the entire `.github/workflows/publish.yml` with:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install -g npm@latest
      - run: npm --version
      - run: npm ci
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: switch publish trigger from push-to-main to version tags"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (timeAgo, resolvePath, getProjects/getLatestMtime)

- [ ] **Step 2: Run the CLI end-to-end**

Run: `node bin/quickclaude.js`
Expected:
- Header "quickclaude" prints
- Autocomplete project list appears, sorted by recent usage
- Typing filters projects
- Selecting a project launches claude in that directory

- [ ] **Step 3: Verify no leftover @clack/prompts references**

Run: `grep -r "clack" bin/ package.json`
Expected: No matches

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup after improvements"
```
