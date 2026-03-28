#!/usr/bin/env node

import * as p from "@clack/prompts";
import { readdirSync, existsSync } from "fs";
import { join, sep } from "path";
import { homedir } from "os";
import { execSync, spawn } from "child_process";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// 인코딩된 디렉토리명에서 실제 경로를 복원
// "-Users-seunghyunhong-Documents-projects-mcp-overwatch" 같은 경우
// -를 /로 바꾸면 mcp/overwatch가 되어 틀려짐
// → 파일시스템을 실제로 탐색하며 매칭
function resolvePath(encoded) {
  const parts = encoded.replace(/^-/, "").split("-");
  let current = sep;

  let i = 0;
  while (i < parts.length) {
    let matched = false;
    // 긴 조합부터 시도 (mcp-overwatch, Unreal Projects 등)
    for (let len = parts.length - i; len >= 1; len--) {
      const segment = parts.slice(i, i + len);
      // "-"와 " " 두 가지 구분자 조합을 모두 시도
      const separators = ["-", " "];
      for (const joiner of separators) {
        const candidate = segment.join(joiner);
        const fullPath = join(current, candidate);
        if (existsSync(fullPath)) {
          current = fullPath;
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

function getProjects() {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    return [];
  }

  const entries = readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true });

  return entries
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
    .sort((a, b) => a.path.localeCompare(b.path));
}

function getProjectLabel(path) {
  const home = homedir();
  const display = path.startsWith(home) ? "~" + path.slice(home.length) : path;
  return display;
}

async function main() {
  p.intro("quickclaude");

  const projects = getProjects();

  if (projects.length === 0) {
    p.cancel("No Claude projects found.");
    process.exit(1);
  }

  const selected = await p.select({
    message: "Select a project",
    options: projects.map((proj) => ({
      value: proj.path,
      label: getProjectLabel(proj.path),
    })),
  });

  if (p.isCancel(selected)) {
    p.cancel("Cancelled");
    process.exit(0);
  }

  p.outro(`Launching Claude in ${selected}`);

  // claude 실행 (현재 터미널에서 interactive하게)
  const child = spawn("claude", [], {
    cwd: selected,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
