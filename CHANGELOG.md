# Changelog

## [1.0.0] - 2026-06-27

### Changed — complete rewrite
- **Token Saver only** — removed hallucination radar, auto-correction, agent injection, prompt tracking.
- Professional skeleton engine for 15+ languages (unchanged extractors).
- **Copy Context Bundle** — one-shot minimal Agent context.
- **Index Workspace** — `.oxygen/project-map.md` + `token-index.json`.
- **Token Scope** — `.cursorignore` blocking (replaces geo-fence/backbone rules).
- **Minify Selection** — compress selected code for clipboard.
- Status bar shows saved tokens + $ + large-file warning.

### Removed
- All agent correction/injection modules
- Hallucination detection
- Clipboard prompt capture
- `.cursor/rules` auto-injection

## [0.3.x]

- Legacy agent correction builds (deprecated)
