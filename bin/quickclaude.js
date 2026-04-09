#!/usr/bin/env node

import prompts from "prompts";
import { readdirSync, existsSync, statSync, realpathSync } from "fs";
import { join, sep } from "path";
import { homedir } from "os";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// 인코딩된 디렉토리명에서 실제 경로를 복원
// "-Users-seunghyunhong-Documents-projects-mcp-overwatch" 같은 경우
// -를 /로 바꾸면 mcp/overwatch가 되어 틀려짐
// → 파일시스템을 실제로 탐색하며 매칭
function resolvePath(encoded, root = sep) {
  const parts = encoded.replace(/^-/, "").split("-").filter(Boolean);
  if (parts.length === 0) return null;
  let current = root;
  let i = 0;

  // Windows: "C--Users-..." → drive letter "C:" 처리
  if (root === sep && parts.length >= 1 && /^[A-Za-z]$/.test(parts[0])) {
    const drive = parts[0].toUpperCase() + ":\\";
    if (existsSync(drive)) {
      current = drive;
      i = 1;
    }
  }

  while (i < parts.length) {
    let entryList;
    try {
      entryList = readdirSync(current);
    } catch {
      return null;
    }
    const entries = new Set(entryList);
    // Case-insensitive fallback (Windows and macOS are case-insensitive by default)
    const ciMap = new Map(entryList.map((e) => [e.toLowerCase(), e]));

    let matched = false;
    for (let len = parts.length - i; len >= 1; len--) {
      const segment = parts.slice(i, i + len);
      for (const joiner of ["-", " ", ".", "_"]) {
        const candidate = segment.join(joiner);
        const actual = entries.has(candidate)
          ? candidate
          : ciMap.get(candidate.toLowerCase()) ?? null;
        if (actual) {
          current = join(current, actual);
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) return null;
  }

  return current;
}

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
    try {
      return statSync(dirPath).mtimeMs;
    } catch {
      return 0;
    }
  }
}

function deduplicateProjects(projects, platform = process.platform) {
  if (platform !== "win32") return projects;
  const seen = new Map();
  for (const p of projects) {
    const key = p.path.toLowerCase();
    const existing = seen.get(key);
    if (!existing || p.mtime > existing.mtime) {
      seen.set(key, p);
    }
  }
  return [...seen.values()];
}

function getProjects() {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    return [];
  }

  const entries = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });

  const sorted = entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const path = resolvePath(e.name);
      return { dirName: e.name, path };
    })
    .filter((p) => {
      if (!p.path) return false;
      if (p.path.includes(`claude${sep}worktrees`)) return false;
      return existsSync(p.path);
    })
    .map((p) => {
      const projectDir = join(CLAUDE_PROJECTS_DIR, p.dirName);
      const mtime = getLatestMtime(projectDir);
      return { ...p, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return deduplicateProjects(sorted);
}

function timeAgo(mtimeMs) {
  const seconds = Math.floor((Date.now() - mtimeMs) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getProjectLabel(path, mtimeMs) {
  const home = homedir();
  const display = path.startsWith(home) ? "~" + path.slice(home.length) : path;
  return `${timeAgo(mtimeMs)} · ${display}`;
}

function getSearchKey(filePath) {
  const segments = filePath.split(/[\\/]/).filter(Boolean);
  return segments.slice(-2).join("/");
}

function fuzzyMatch(input, target) {
  const lower = input.toLowerCase();
  const t = target.toLowerCase();
  let j = 0;
  for (let i = 0; i < t.length && j < lower.length; i++) {
    if (t[i] === lower[j]) j++;
  }
  return j === lower.length;
}

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
    searchKey: getSearchKey(proj.path),
  }));

  let cancelled = false;
  const response = await prompts(
    {
      type: "autocomplete",
      name: "project",
      message: "Select a project (type to search)",
      choices,
      suggest: (input, choices) => {
        if (!input) return Promise.resolve(choices);
        return Promise.resolve(
          choices.filter((c) => fuzzyMatch(input, c.searchKey))
        );
      },
      onState: (state) => {
        if (state.aborted || state.exited) {
          cancelled = true;
        }
      },
    },
    {
      onCancel: () => {
        cancelled = true;
      },
    }
  );

  if (cancelled || !response.project) {
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
    shell: process.platform === "win32",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error(`Failed to launch Claude: ${err.message}`);
    process.exit(1);
  });
}

export { resolvePath, timeAgo, getProjectLabel, getProjects, getLatestMtime, deduplicateProjects, getSearchKey, fuzzyMatch };

try {
  if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
  }
} catch {
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
  }
}
