# Oxygen — Token Saver

**Developers:** Harith Riad Hassan & Rafea Read Hussein

A **Cursor / VS Code** extension that saves AI Agent tokens — without affecting how the Agent works.

## How it works

Oxygen is **fully passive**: it reads your files, extracts compressed skeletons, and shows savings — it does **not** modify `.cursorignore`, inject prompts, or interfere with the Agent.

```
Open/edit file → extract skeleton → save to .oxygen/skeletons/
              → update status bar (O2 Oxygen)
              → index workspace (automatic on open)
              → watch disk changes (Agent edits)
```

## Features

| Feature | Description |
|---------|-------------|
| **Skeleton** | Extracts function/class/import signatures — typically 70–95% savings |
| **Copy Context Bundle** | Ready-to-paste minimal context for Agent chat |
| **Copy File Skeleton** | Active file skeleton to clipboard |
| **Index Workspace** | Index project → `.oxygen/project-map.md` |
| **Reset Session Counter** | Reset counter and re-index automatically |
| **Minify Selection** | Compress selected code (manual) |
| **Save Focus Scope** | Save focus scope → `.oxygen/context-scope.json` (metadata only) |
| **Session Tracker** | Track token and $ savings in the status bar |

## Installation

```bash
npm run install:cursor
```

1. **Close Cursor completely**
2. Reopen Cursor and open your project
3. Open a code file (or wait for auto-indexing)
4. Bottom-left status bar: `O2 Oxygen | -tok (+delta) | $saved`

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **Oxygen**:

| Command | Description |
|---------|-------------|
| **Oxygen: Copy Context Bundle** | Paste into Agent instead of full files |
| **Oxygen: Copy File Skeleton** | Skeleton of the active file |
| **Oxygen: Index Workspace** | Re-index the project |
| **Oxygen: Reset Session Counter** | Zero the counter and re-index |
| **Oxygen: Minify Selection** | Minify selection → clipboard |
| **Oxygen: Cache Skeleton** | Cache skeleton for the active file |
| **Oxygen: Save Focus Scope** | Save focus scope metadata |
| **Oxygen: Copy Session Summary** | Copy session summary to clipboard |
| **Oxygen: Show Log** | Open the Oxygen output log |

## Generated files

Oxygen writes these under `.oxygen/` in your workspace:

| File / folder | Purpose |
|---------------|---------|
| `skeletons/` | Compressed skeletons (`.skel.txt`) |
| `project-map.md` | Token map for the project |
| `token-index.json` | JSON index |
| `framework.json` | Detected framework (Flutter, RN, Expo, etc.) |
| `context-scope.json` | Focus scope (informational) |
| `session-summary.md` | Session summary |
| `session-summary.json` | Session summary (JSON) |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `oxygen.ui.showStatusBar` | `true` | Show savings in the bottom-left status bar |
| `oxygen.pricing.preset` | `composer` | Pricing model for $ display |
| `oxygen.skeleton.autoCache` | `true` | Auto-cache skeletons while editing |
| `oxygen.tokens.autoIndexOnOpen` | `true` | Index workspace when the project opens |
| `oxygen.tokens.watchFiles` | `true` | Update when files change on disk (Agent edits) |
| `oxygen.scope.autoApply` | `true` | Auto-save scope (does not modify Agent) |
| `oxygen.session.autoSummary` | `true` | Write session summary every 3 minutes |

## Token estimates

Status bar numbers use a **code-aware estimate** (identifiers + operators), closer to tiktoken than `chars ÷ 4`. Real LLM token counts may differ by about **±15%**.

---

**v1.0.4** — Token Saver only. Passive mode.
