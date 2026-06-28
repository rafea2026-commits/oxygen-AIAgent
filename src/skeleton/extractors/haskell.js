'use strict';

const path = require('path');

/**
 * Haskell skeleton — module, imports, type/data/class declarations.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractHaskellSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let skippingWhere = false;
    let whereIndent = 0;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        const indent = rawLine.match(/^(\s*)/)?.[1].length ?? 0;

        if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('{-')) {
            continue;
        }

        if (skippingWhere) {
            if (indent <= whereIndent && !/^\s/.test(rawLine)) {
                skippingWhere = false;
            } else {
                continue;
            }
        }

        if (/^(module|import|qualified|foreign|{-#)\b/.test(trimmed)) {
            output.push(trimmed);
            continue;
        }

        if (/^(data|newtype|type|class|instance|deriving|pattern|family|type\s+family|data\s+family)\b/.test(trimmed)) {
            const collapsed = trimmed
                .replace(/\bwhere\b[\s\S]*$/, 'where ...')
                .replace(/\=\s*.+$/, '= ...');
            output.push(collapsed);
            if (/\bwhere\b/.test(trimmed)) {
                skippingWhere = true;
                whereIndent = indent;
            }
            continue;
        }

        if (/^[a-z_][\w']*\s*::/.test(trimmed)) {
            output.push(trimmed.replace(/\s*=\s*.+$/, ' = ...'));
        }
    }

    const header = filePath
        ? `-- Oxygen Skeleton (Haskell): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

module.exports = { extractHaskellSkeleton };
