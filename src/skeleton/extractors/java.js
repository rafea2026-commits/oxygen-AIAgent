'use strict';

/**
 * Java skeleton — Android Java, Spring annotations, classes, interfaces.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractJavaSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let pending = '';
    let inBlockComment = false;

    for (const rawLine of lines) {
        let line = rawLine;

        if (inBlockComment) {
            if (line.includes('*/')) {
                inBlockComment = false;
                line = line.slice(line.indexOf('*/') + 2);
            } else {
                continue;
            }
        }

        if (line.includes('/*') && !line.includes('*/')) {
            inBlockComment = true;
            line = line.slice(0, line.indexOf('/*'));
        }

        line = line.replace(/\/\/.*$/, '').trim();
        if (!line) {
            continue;
        }

        if (/^package\s+/.test(line) || /^import\s+/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^@\w+/.test(line) && !/[({;]/.test(line.replace(/^@\w+(\([^)]*\))?\s*/, ''))) {
            pending = line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|protected\s+|abstract\s+|final\s+|static\s+)*(?:class|interface|enum|record)\b/.test(decl)) {
            if (decl.includes('{')) {
                output.push(decl.replace(/\{\s*$/, ' { /* ... */ }'));
            } else {
                pending = decl;
            }
            continue;
        }

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|protected\s+|static\s+|final\s+|synchronized\s+|native\s+)*[\w<>,\[\]\s.?]+\s+\w+\s*\([^)]*\)/.test(decl)) {
            output.push(decl.replace(/\{\s*$/, ' { /* ... */ }').replace(/;\s*$/, ';'));
        }
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath ? `// Oxygen Skeleton (Java): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractJavaSkeleton };
