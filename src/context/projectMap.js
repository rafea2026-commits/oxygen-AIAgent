'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @param {string} workspaceRoot
 * @param {Array<object>} entries
 */
function writeProjectMap(workspaceRoot, entries) {
    const dir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const sorted = [...entries].sort((a, b) => b.originalTokens - a.originalTokens);
    const totalOrig = sorted.reduce((s, e) => s + e.originalTokens, 0);
    const totalSkel = sorted.reduce((s, e) => s + e.skeletonTokens, 0);
    const saved = Math.max(0, totalOrig - totalSkel);
    const pct = totalOrig > 0 ? Math.round((saved / totalOrig) * 100) : 0;

    const lines = [
        '# Oxygen — Project Map',
        '',
        `Updated: ${new Date().toISOString()}`,
        `Files indexed: ${sorted.length}`,
        `Tokens: ${totalOrig.toLocaleString()} → ${totalSkel.toLocaleString()} skeleton (${pct}% smaller)`,
        '',
        '| File | Original | Skeleton | Saved |',
        '|------|----------|----------|-------|',
    ];

    for (const e of sorted.slice(0, 80)) {
        const savePct = e.originalTokens > 0
            ? Math.round((1 - e.skeletonTokens / e.originalTokens) * 100)
            : 0;
        lines.push(`| \`${e.rel}\` | ${e.originalTokens} | ${e.skeletonTokens} | ${savePct}% |`);
    }

    if (sorted.length > 80) {
        lines.push('', `_…and ${sorted.length - 80} more files in token-index.json_`);
    }

    lines.push(
        '',
        '## Usage',
        '- Attach **skeletons** from `.oxygen/skeletons/` instead of full files.',
        '- Run **Oxygen: Copy Context Bundle** for a ready-to-paste minimal context.',
        ''
    );

    const md = lines.join('\n');
    fs.writeFileSync(path.join(dir, 'project-map.md'), md, 'utf8');
    fs.writeFileSync(path.join(dir, 'token-index.json'), JSON.stringify({
        updatedAt: new Date().toISOString(),
        fileCount: sorted.length,
        totalOriginalTokens: totalOrig,
        totalSkeletonTokens: totalSkel,
        savedTokens: saved,
        savedPercent: pct,
        files: sorted,
    }, null, 2), 'utf8');

    return { mdPath: path.join(dir, 'project-map.md'), savedTokens: saved, savedPercent: pct };
}

/**
 * @param {object} result from processFile
 */
function entryFromProcessResult(result) {
    return {
        rel: result.rel,
        originalTokens: result.originalTokens,
        skeletonTokens: result.skeletonTokens,
        compressionRatio: result.compressionRatio,
        languageGroup: result.languageGroup,
        cachePath: result.cachePath,
    };
}

module.exports = { writeProjectMap, entryFromProcessResult };
