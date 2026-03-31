# quickclaude

CLI launcher for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
Quickly launch Claude Code in your project directories.

```
$ quickclaude

┌  quickclaude
│
◆  Select a project
│  ● 2h ago · ~/Documents/projects/my-app1
│  ○ 3d ago · ~/Documents/projects/my-app2
│  ○ 1w ago · ~/Documents/projects/my-app3
└
```

## How it works

Claude Code stores [auto memory](https://docs.anthropic.com/en/docs/claude-code/memory) for each project under `~/.claude/projects/`. Every time you run Claude Code in a directory, it creates a subdirectory there to save project-specific memory like build commands, debugging patterns, and architecture notes.

quickclaude uses this directory structure in reverse — it scans `~/.claude/projects/` to build a list of projects you've used with Claude Code, then lets you pick one and launch `claude` right there.

1. Scans `~/.claude/projects/` to discover your Claude Code projects
2. Sorts by most recently used, with relative timestamps (e.g. `2h ago`)
3. Shows an interactive selection menu
4. Launches `claude` in the selected directory

Any CLI arguments are forwarded to `claude`:

```bash
quickclaude --resume
# equivalent to: cd <selected-project> && claude --resume
```

## Install

```bash
npm install -g quickclaude
```

Or run without installing:

```bash
npx quickclaude
```

## Update

```bash
npm update -g quickclaude
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Node.js 18+

## License

MIT
