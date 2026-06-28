# Changelog

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
