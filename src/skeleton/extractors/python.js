'use strict';

const { extractGenericSkeleton } = require('./generic');

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractPythonSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let inDocstring = false;
    let docstringChar = '';

    for (const rawLine of lines) {
        let line = rawLine;
        const trimmed = line.trim();

        if (inDocstring) {
            if (trimmed.includes(docstringChar)) {
                inDocstring = false;
            }
            continue;
        }

        if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
            docstringChar = trimmed.startsWith('"""') ? '"""' : "'''";
            if (trimmed.split(docstringChar).length - 1 < 2) {
                inDocstring = true;
            }
            continue;
        }

        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        if (/^(import|from|class|def|async\s+def|@|if\s+TYPE_CHECKING)/.test(trimmed)) {
            if (/^(class|def|async\s+def)\b/.test(trimmed)) {
                output.push(trimmed.replace(/:\s*$/, ': ...'));
            } else {
                output.push(trimmed);
            }
        }
    }

    const header = filePath ? `# Oxygen Skeleton: ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractPythonSkeleton };
