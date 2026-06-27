'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Tracks session activity for auto-summary generation.
 */
class SessionActivity {
    constructor() {
        this.startedAt = new Date();
        /** @type {Map<string, { path: string, edits: number, lastSeen: Date }>} */
        this.files = new Map();
        /** @type {Array<{ at: Date, score: number, level: string, file?: string, findings: string[] }>} */
        this.hallucinationEvents = [];
        /** @type {string | undefined} */
        this.lastScopeLabel = undefined;
        /** @type {number} */
        this.summaryWriteCount = 0;
    }

    /**
     * @param {string} filePath
     */
    touchFile(filePath) {
        const rel = filePath;
        const existing = this.files.get(rel);
        if (existing) {
            existing.edits += 1;
            existing.lastSeen = new Date();
        } else {
            this.files.set(rel, { path: rel, edits: 1, lastSeen: new Date() });
        }
    }

    /**
     * @param {import('../hallucination/detector').detectHallucination extends (...args: any[]) => infer R ? R : never} result
     * @param {string} [filePath]
     */
    recordHallucination(result, filePath) {
        if (result.level === 'ok') {
            return;
        }
        this.hallucinationEvents.push({
            at: new Date(),
            score: result.score,
            level: result.level,
            file: filePath,
            findings: result.findings.slice(0, 5),
        });
        if (this.hallucinationEvents.length > 50) {
            this.hallucinationEvents.shift();
        }
    }

    /**
     * @param {string} scopeLabel
     */
    setScope(scopeLabel) {
        this.lastScopeLabel = scopeLabel;
    }
}

/**
 * @param {object} opts
 * @param {SessionActivity} opts.activity
 * @param {import('../core/session').SessionTracker} opts.session
 * @param {{ label: string, inputPerMillion: number, preset?: string }} opts.pricing
 * @param {string} [opts.activeFile]
 */
function buildSessionSummary({ activity, session, pricing, activeFile }) {
    const durationMin = Math.round((Date.now() - activity.startedAt.getTime()) / 60000);
    const files = [...activity.files.values()]
        .sort((a, b) => b.edits - a.edits)
        .slice(0, 12);

    const recentAlerts = activity.hallucinationEvents.slice(-5);
    const saved = session.getTotalSavedUSD();

    const lines = [
        '# Oxygen — Session Summary (auto)',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Duration: ~${durationMin} min`,
        `Pricing model: ${pricing.label} ($${pricing.inputPerMillion}/1M input tokens)`,
        '',
        '## Savings',
        `- Estimated saved this session: **$${saved.toFixed(4)}**`,
        '',
        '## Active focus',
        `- Current scope: ${activity.lastScopeLabel ?? '(not set)'}`,
        `- Active file: ${activeFile ?? '(none)'}`,
        '',
        '## Files touched',
    ];

    if (files.length === 0) {
        lines.push('- (none yet)');
    } else {
        for (const f of files) {
            lines.push(`- \`${f.path}\` (${f.edits} edits)`);
        }
    }

    lines.push('', '## Hallucination radar (recent)');
    if (recentAlerts.length === 0) {
        lines.push('- No warnings this session.');
    } else {
        for (const ev of recentAlerts) {
            lines.push(`- [${ev.level}] score ${ev.score}${ev.file ? ` — ${ev.file}` : ''}`);
            for (const f of ev.findings) {
                lines.push(`  - ${f}`);
            }
        }
    }

    lines.push(
        '',
        '## Paste into a fresh Agent chat',
        '```',
        'Continue from Oxygen session summary.',
        `Scope: ${activity.lastScopeLabel ?? 'current file folder'}.`,
        `Task: [one sentence — what to do next]`,
        'Rules: no invented paths; use .oxygen/skeletons/; short answers.',
        '```',
        ''
    );

    return lines.join('\n');
}

/**
 * @param {string} workspaceRoot
 * @param {string} markdown
 * @param {SessionActivity} activity
 * @param {number} savedUSD
 */
function writeSessionSummary(workspaceRoot, markdown, activity, savedUSD) {
    const dir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const mdPath = path.join(dir, 'session-summary.md');
    const jsonPath = path.join(dir, 'session-summary.json');

    fs.writeFileSync(mdPath, markdown, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify({
        updatedAt: new Date().toISOString(),
        savedUSD,
        filesTouched: activity.files.size,
        alertCount: activity.hallucinationEvents.length,
        scope: activity.lastScopeLabel,
    }, null, 2), 'utf8');

    activity.summaryWriteCount += 1;
    return mdPath;
}

module.exports = {
    SessionActivity,
    buildSessionSummary,
    writeSessionSummary,
};
