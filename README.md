# quickclaude

CLI launcher for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).
Quickly launch Claude Code in your project directories.

```
$ quickclaude
```
<img width="406" height="272" alt="Screenshot 2026-04-04 at 8 33 09 PM" src="https://github.com/user-attachments/assets/4ee37895-eaac-4dd6-90a8-589ec640f420" />


## How it works

Claude Code stores [auto memory](https://docs.anthropic.com/en/docs/claude-code/memory) for each project under `~/.claude/projects/`. Every time you run Claude Code in a directory, it creates a subdirectory there to save project-specific memory like build commands, debugging patterns, and architecture notes.

quickclaude uses this directory structure in reverse — it scans `~/.claude/projects/` to build a list of projects you've used with Claude Code, then lets you pick one and launch `claude` right there.

1. Scans `~/.claude/projects/` to discover your Claude Code projects
2. Sorts by most recently used, with relative timestamps (e.g. `2h ago`)
3. Shows an interactive selection menu with fuzzy search
4. Launches `claude` in the selected directory

Any CLI arguments are forwarded to `claude`:

```bash
quickclaude --resume
# equivalent to: cd <selected-project> && claude --resume
```

## Features

- **Fuzzy search** — Type to filter projects instantly (start typing to search)
- **Smart sorting** — Projects sorted by most recently used, with relative timestamps
- **Path resolution** — Accurately resolves encoded project directory names back to real paths
- **Argument forwarding** — Any CLI arguments are passed through to `claude`

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
