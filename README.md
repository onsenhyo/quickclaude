# quickclaude

CLI launcher for Claude Code.
Quickly launch Claude Code in your project directories.
<img width="762" height="383" alt="Screenshot 2026-03-28 at 6 25 10 PM" src="https://github.com/user-attachments/assets/4f368300-9748-4190-87c1-f2a1fcfd8a63" />


```
$ quickclaude

┌  quickclaude
│
◆  Select a project
│  ● ~/Documents/projects/my-app1
│  ○ ~/Documents/projects/my-app2
│  ○ ~/Documents/projects/my-app3
└
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

## How it works

1. Scans `~/.claude/projects/` for Claude Code project directories
2. Shows an interactive list to pick from
3. Launches `claude` in the selected directory

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- Node.js 18+

## License

MIT
