---
name: agent-browser
description: Browser automation CLI for interacting with websites, filling forms, taking screenshots, and manually verifying web apps. Load the CLI's core workflow before browser work.
allowed-tools: Bash(agent-browser:*)
---

# agent-browser

Use the [agent-browser CLI](https://github.com/vercel-labs/agent-browser) for browser automation and manual app verification.

Install the CLI and Chromium if needed:

```sh
pnpm add --global agent-browser
agent-browser install
```

Before running browser commands, load the workflow matching the installed CLI version:

```sh
agent-browser skills get core
```

For the complete command reference and templates:

```sh
agent-browser skills get core --full
```

Use accessibility snapshots and their element references to navigate and fill forms. Re-snapshot after page changes.
Verify this app manually; do not add UI, component, or browser tests.

For exploratory testing, load `agent-browser skills get dogfood`. Run `agent-browser skills list` for other workflows.
