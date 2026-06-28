'use strict';

const fs = require('fs');
const path = require('path');

class SessionActivity {
    constructor() {
        this.startedAt = new Date();
        /** @type {Map<string, { path: string, edits: number }>} */
        this.files = new Map();
        /** @type {string | undefined} */
        this.lastScopeLabel = undefined;
        /** @type {number} */
        this.indexedFiles = 0;
        /** @type {string | undefined} */
        this.frameworkLabel = undefined;
    }

    touchFile(filePath) {
        const existing = this.files.get(filePath);
        if (existing) {
            existing.edits += 1;
        } else {
            this.files.set(filePath, { path: filePath, edits: 1 });
        }
    }

    setScope(scopeLabel) {
        this.lastScopeLabel = scopeLabel;
    }

    setIndexed(count) {
        this.indexedFiles = count;
    }

    setFramework(label) {
        this.frameworkLabel = label;
    }

    reset() {
        this.startedAt = new Date();
        this.files.clear();
        this.lastScopeLabel = undefined;
        this.indexedFiles = 0;
        this.frameworkLabel = undefined;
    }
}

function buildSessionSummary({ activity, session, pricing, activeFile }) {
    const durationMin = Math.round((Date.now() - activity.startedAt.getTime()) / 60000);
    const files = [...activity.files.values()]
        .sort((a, b) => b.edits - a.edits)
        .slice(0, 15);
    const savedUSD = session.getTotalSavedUSD();
    const savedTokens = session.getTotalSavedTokens();

    const lines = [
        '# Oxygen — Token Session Summary',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Duration: ~${durationMin} min`,
        `Model: ${pricing.label} ($${pricing.inputPerMillion}/1M input)`,
        activity.frameworkLabel ? `Framework: ${activity.frameworkLabel}` : '',
        '',
        '## Savings',
        `- Tokens saved: **~${savedTokens.toLocaleString()}**`,
        `- Estimated $ saved: **$${savedUSD.toFixed(4)}**`,
        `- Files indexed: ${activity.indexedFiles}`,
        '',
        '## Focus',
        `- Scope: ${activity.lastScopeLabel ?? '(open a source file)'}`,
        `- Active: ${activeFile ?? '(none)'}`,
        '',
        '## Files edited',
    ];

    if (files.length === 0) {
        lines.push('- (none yet)');
    } else {
        for (const f of files) {
            lines.push(`- \`${f.path}\` (${f.edits} edits)`);
        }
    }

    lines.push(
        '',
        '## Token saver tips',
        '- Paste **Oxygen: Copy Context Bundle** into Agent — not full files.',
        '- Skeletons live in `.oxygen/skeletons/` and `.oxygen/project-map.md`.',
        '- Large file? Use **Copy Skeleton** instead of copying the whole file.',
        ''
    );

    return lines.join('\n');
}

function writeSessionSummary(workspaceRoot, markdown, activity, savedUSD, savedTokens) {
    const dir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const mdPath = path.join(dir, 'session-summary.md');
    fs.writeFileSync(mdPath, markdown, 'utf8');
    fs.writeFileSync(path.join(dir, 'session-summary.json'), JSON.stringify({
        updatedAt: new Date().toISOString(),
        savedUSD,
        savedTokens,
        filesTouched: activity.files.size,
        indexedFiles: activity.indexedFiles,
        scope: activity.lastScopeLabel,
    }, null, 2), 'utf8');

    return mdPath;
}

module.exports = { SessionActivity, buildSessionSummary, writeSessionSummary };
