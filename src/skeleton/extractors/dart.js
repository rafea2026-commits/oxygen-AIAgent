'use strict';

/**
 * Dart / Flutter skeleton — classes, widgets, mixins, extensions, enums.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractDartSkeleton(source, filePath) {
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

        // Strip single-line doc comments
        if (line.startsWith('///') || line.startsWith('/**')) {
            continue;
        }

        if (/^(import|export|part|part of|library)\b/.test(line)) {
            output.push(line.replace(/\s+$/, ''));
            continue;
        }

        // Annotations on their own or attached to declarations
        if (/^@\w+/.test(line) && !/[({;]/.test(line.replace(/^@\w+\([^)]*\)\s*/, ''))) {
            pending = line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:abstract\s+)?(?:class|mixin|extension|enum|typedef)\b/.test(decl)) {
            if (decl.includes('{')) {
                const sig = decl.replace(/\{\s*$/, '').trim();
                output.push(`${sig} { /* ... */ }`);
            } else {
                pending = decl;
            }
            continue;
        }

        if (/^(?:@\w+(?:\([^)]*\))?\s+)*(?:static\s+)?(?:Future<[^>]+>|void|Widget|String|int|bool|double|[\w<>,\s?]+)\s+\w+\s*\(/.test(decl)) {
            output.push(decl.replace(/\{\s*$/, '{ /* ... */ }').replace(/;\s*$/, ';'));
            continue;
        }

        if (/^void\s+main\s*\(/.test(decl)) {
            output.push(decl.replace(/\{\s*$/, '{ /* ... */ }'));
            continue;
        }

        if (/^const\s+\w+\s*=/.test(decl) || /^final\s+\w+\s*=/.test(decl)) {
            output.push(decl.replace(/=\s*.+$/, '= /* ... */;'));
        }
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath ? `// Oxygen Skeleton (Dart/Flutter): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractDartSkeleton };
