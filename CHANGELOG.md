# Changelog

## [1.0.8] - 2026-07-18

### Added
- Activation UI: license key field + **Activate** button (editor panel + Oxygen sidebar view).
- Note: Marketplace DETAILS cannot host interactive forms — activation is in-extension.

## [1.0.7] - 2026-07-18

### Fixed
- Session counter no longer fills from auto-index / background file cache.
- Counter increases only when you use Oxygen commands (Copy Skeleton, Context Bundle, Minify, Cache Skeleton).
- Reset Session Counter re-indexes cache but keeps the counter at **0**.

## [1.0.6] - 2026-07-18

### Added
- Local serverless subscription gate (AES license keys via `crypto-js`).
- Extension stays locked until a valid time-bound key is entered.
- Command **Oxygen: Enter / Renew License**.
- Developer tool: `npm run license:generate` (default +30 days).

## [1.0.5] - 2026-06-28

### Added
- Extension icon (`icon.png`).

## [1.0.4] - 2026-06-28

### Added
- Developer credits in extension details: Harith Riad Hassan & Rafea Read Hussein.

## [1.0.3] - 2026-06-28

### Changed
- Extension DETAILS page: all text in English (README + package description).
- Removed project structure section from README.

## [1.0.2] - 2026-06-28

### Improved
- **Token estimation** — code-aware counting (identifiers, operators) instead of flat `chars/4`.
- **Kotlin** — collapses long import blocks, `data class` props, and `@Composable` signatures.
- **YAML/JSON** — dependency sections show key names only, not versions.
- **Status bar** — shows last update delta `(+N tok)` when files change.
- **File watcher** — scoped to source extensions + framework files (faster on large repos).

### Docs
- README updated with `watchFiles`, `Reset Session Counter`, and token estimation note.

## [1.0.1] - 2026-06-28

### Fixed
- Install script registers extension in Cursor (`extensions.json` + `.obsolete` cleanup).
- Status bar moved to bottom-left with clear `O2 Oxygen` text (Windows compatible).
- Session metrics track skeleton/minify savings only (no false counts on keystrokes).

### Changed
- Scope is metadata-only — never modifies `.cursorignore` or Agent behavior.
- Install via `node scripts/install-to-cursor.js` (removed PowerShell script).
- Removed unused dev dependencies (test-cli, test-electron, mocha).

## [1.0.0] - 2026-06-27

### Changed — complete rewrite
- **Token Saver only** — removed hallucination radar, auto-correction, agent injection.
- Skeleton engine for 15+ languages.
- **Copy Context Bundle** — minimal Agent context in one paste.
- **Index Workspace** — `.oxygen/project-map.md` + `token-index.json`.
- **Minify Selection** — compress selected code for clipboard.
- Status bar shows saved tokens + $.

### Removed
- Hallucination detection, agent correction/injection, `.cursor/rules` auto-injection.

## [0.3.x]

- Legacy agent correction builds (deprecated).
