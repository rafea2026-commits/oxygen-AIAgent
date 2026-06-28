'use strict';

const { createBraceExtractor } = require('./shared/brace');
const { createIndentExtractor } = require('./shared/indent');
const { extractGenericSkeleton } = require('./generic');

const extractPhpSkeleton = createBraceExtractor({
    label: 'PHP',
    headerLine: /^(<\?php|namespace|use|require|include|require_once|include_once)\b/,
    annotationLine: /^#\[\w+/,
    typeDecl: /^(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\b/,
    topLevelDecl: /^(?:public\s+|private\s+|protected\s+|static\s+|async\s+)?function\s+\w+\s*\(/,
});

const extractRubySkeleton = createIndentExtractor({
    label: 'Ruby',
    commentPrefix: '#',
    headerLine: /^(require|require_relative|include|extend|prepend|class\s*<<)\b/,
    blockStart: /^(module|class|def|define_method|namespace)\b/,
    useEndKeyword: true,
    blockEnd: /^end\b/,
    formatBlockStart: (line) => `${line} ... end`,
});

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

/** @param {string} source @param {string} [filePath] */
function extractLuaSkeleton(source, filePath) {
    return extractGenericSkeleton(source, filePath);
}

/** @param {string} source @param {string} [filePath] */
function extractShellSkeleton(source, filePath) {
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
        if (/^(function\s+\w+|function\s*\(|if\s|for\s|while\s|case\s|select\s|\w+\(\))\b/.test(trimmed)) {
            output.push(trimmed.replace(/\{\s*$/, '{ /* ... */ }').replace(/\s*;\s*do\s*$/, ' do ... done'));
        } else if (/^(source|\.|export|alias|local|declare|readonly)\b/.test(trimmed)) {
            output.push(trimmed);
        }
    }

    const header = filePath ? `# Oxygen Skeleton (Shell): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = {
    extractPhpSkeleton,
    extractRubySkeleton,
    extractMarkupSkeleton,
    extractLuaSkeleton,
    extractShellSkeleton,
};
