'use strict';

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractGoSkeleton(source, filePath) {
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

        if (/^package\s+\w+/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^import\s/.test(line) || line === '(' || line === ')') {
            if (line !== '(' && line !== ')') {
                output.push(line.endsWith('(') ? line : line.replace(/\)$/, ''));
            }
            continue;
        }

        if (/^(type|func|interface|const|var)\b/.test(line)) {
            if (line.includes('{')) {
                if (/^func\s/.test(line)) {
                    output.push(line.replace(/\{\s*$/, '{ /* ... */ }'));
                } else if (/^type\s+\w+\s+(struct|interface)\s*\{/.test(line)) {
                    const name = line.match(/^type\s+(\w+)/)?.[1] ?? 'Type';
                    const kind = line.includes('interface') ? 'interface' : 'struct';
                    output.push(`type ${name} ${kind} { /* fields */ }`);
                } else {
                    output.push(line.replace(/\{\s*$/, '{ /* ... */ }'));
                }
            } else if (line.endsWith('{')) {
                pending = line;
            } else {
                output.push(line);
            }
            continue;
        }

        if (pending) {
            output.push(pending.replace(/\{\s*$/, '{ /* ... */ }'));
            pending = '';
        }
    }

    const header = filePath ? `// Oxygen Skeleton (Go): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractGoSkeleton };
