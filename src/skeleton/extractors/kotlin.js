'use strict';

/**
 * Kotlin / Jetpack Compose skeleton — classes, composables, suspend functions.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractKotlinSkeleton(source, filePath) {
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

        if (/^package\s+/.test(line) || /^import\s+/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^@\w+/.test(line) && !/[({]/.test(line.replace(/^@\w+(\([^)]*\))?\s*/, ''))) {
            pending = line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|abstract\s+|sealed\s+)*(?:data\s+)?(?:class|object|interface|enum\s+class)\b/.test(decl)) {
            if (decl.includes('{')) {
                output.push(decl.replace(/\{\s*$/, ' { /* ... */ }'));
            } else if (decl.endsWith(')')) {
                output.push(`${decl} { /* ... */ }`);
            } else {
                pending = decl;
            }
            continue;
        }

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:override\s+|suspend\s+|private\s+|public\s+|internal\s+)*fun\s+/.test(decl)) {
            output.push(decl.replace(/\{\s*$/, ' { /* ... */ }').replace(/=\s*.+$/, '= /* ... */'));
            continue;
        }

        if (/^(?:val|var)\s+\w+/.test(decl)) {
            output.push(decl.replace(/=\s*.+$/, '= /* ... */'));
        }
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath ? `// Oxygen Skeleton (Kotlin): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractKotlinSkeleton };
