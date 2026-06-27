'use strict';

const { extractGenericSkeleton } = require('./generic');

/** @param {string} source @param {string} [filePath] */
function extractPhpSkeleton(source, filePath) {
    return extractGenericSkeleton(source, filePath);
}

/** @param {string} source @param {string} [filePath] */
function extractRubySkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        if (/^(require|include|module|class|def|attr_|extend|prepend|private|protected|public)\b/.test(trimmed)) {
            output.push(/^(class|module|def)\b/.test(trimmed) ? trimmed + ' ... end' : trimmed);
        }
    }

    const header = filePath ? `# Oxygen Skeleton: ${filePath}\n` : '';
    return header + output.join('\n');
}

/** @param {string} source @param {string} [filePath] */
function extractMarkupSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const tags = source.match(/<[a-zA-Z][\w-]*(?:\s+[\w-]+(?:="[^"]*")?)*\s*\/?>/g) || [];
    const unique = [...new Set(tags)].slice(0, 40);
    const header = filePath ? `<!-- Oxygen Skeleton: ${filePath} -->\n` : '';
    return header + unique.join('\n');
}

module.exports = {
    extractPhpSkeleton,
    extractRubySkeleton,
    extractMarkupSkeleton,
};
