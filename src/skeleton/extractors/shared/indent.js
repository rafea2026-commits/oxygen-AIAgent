'use strict';

const path = require('path');

/**
 * @typedef {object} IndentSkeletonConfig
 * @property {string} label
 * @property {string} commentPrefix
 * @property {RegExp} headerLine
 * @property {RegExp} blockStart
 * @property {RegExp} [blockEnd]
 * @property {boolean} [useEndKeyword]
 * @property {(line: string) => string} [formatBlockStart]
 */

/**
 * Indent- or end-based skeleton extractor (Python, Ruby, Elixir, etc.).
 * @param {string} source
 * @param {string | undefined} filePath
 * @param {IndentSkeletonConfig} config
 */
function extractIndentSkeleton(source, filePath, config) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let inDocstring = false;
    let docQuote = '';
    /** @type {number[]} */
    const endStack = [];
    const useEnd = config.useEndKeyword === true;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        const indent = rawLine.match(/^(\s*)/)?.[1].length ?? 0;

        if (inDocstring) {
            if (trimmed.includes(docQuote)) {
                inDocstring = false;
            }
            continue;
        }

        if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
            docQuote = trimmed.startsWith('"""') ? '"""' : "'''";
            if ((trimmed.match(/"""/g) || []).length < 2 && (trimmed.match(/'''/g) || []).length < 2) {
                inDocstring = true;
            }
            continue;
        }

        if (!trimmed || trimmed.startsWith(config.commentPrefix)) {
            continue;
        }

        while (endStack.length > 0 && indent <= endStack[endStack.length - 1]) {
            endStack.pop();
        }

        if (useEnd && config.blockEnd?.test(trimmed)) {
            if (endStack.length > 0) {
                endStack.pop();
            }
            continue;
        }

        if (config.headerLine.test(trimmed)) {
            output.push(trimmed);
            continue;
        }

        if (config.blockStart.test(trimmed)) {
            const formatted = config.formatBlockStart
                ? config.formatBlockStart(trimmed)
                : `${trimmed} ...`;
            output.push(formatted);
            endStack.push(indent);
            continue;
        }

        if (useEnd && /\bdo\b\s*$/.test(trimmed)) {
            output.push(`${trimmed.replace(/\s*do\s*$/, '')} do ... end`);
            endStack.push(indent);
        }
    }

    const header = filePath
        ? `${config.commentPrefix} Oxygen Skeleton (${config.label}): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

/**
 * @param {IndentSkeletonConfig} config
 */
function createIndentExtractor(config) {
    return (source, filePath) => extractIndentSkeleton(source, filePath, config);
}

module.exports = {
    extractIndentSkeleton,
    createIndentExtractor,
};
