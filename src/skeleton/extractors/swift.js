'use strict';

/**
 * Swift / SwiftUI skeleton — structs, classes, protocols, extensions, View body.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSwiftSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let pending = '';

    for (const rawLine of lines) {
        let line = rawLine.replace(/\/\/.*$/, '').trim();
        if (!line) {
            continue;
        }

        if (/^import\s+/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^@\w+/.test(line) && !/[({]/.test(line.replace(/^@\w+\([^)]*\)\s*/, ''))) {
            pending = line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|final\s+)*(?:class|struct|enum|protocol|extension|actor)\b/.test(decl)) {
            if (decl.includes('{')) {
                output.push(decl.replace(/\{\s*$/, ' { /* ... */ }'));
            } else {
                pending = decl;
            }
            continue;
        }

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|static\s+|override\s+)*(?:func|init|subscript|var|let)\b/.test(decl)) {
            if (decl.includes('{')) {
                output.push(decl.replace(/\{\s*$/, ' { /* ... */ }'));
            } else {
                output.push(decl.replace(/\s*$/, ''));
            }
            continue;
        }

        if (/var\s+body\s*:\s*some\s+View/.test(decl)) {
            output.push(decl.replace(/\{\s*$/, ' { /* ... */ }'));
        }
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath ? `// Oxygen Skeleton (Swift): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractSwiftSkeleton };
