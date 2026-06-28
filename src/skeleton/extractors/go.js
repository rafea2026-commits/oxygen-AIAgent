'use strict';

const path = require('path');
const { extractBraceSkeleton, braceDelta, stripLineComment } = require('./shared/brace');

/**
 * Go skeleton — package, imports, collapsed type and func declarations.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractGoSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let braceDepth = 0;
    let parenDepth = 0;
    let skippingBody = false;
    let skippingImport = false;

    for (const rawLine of lines) {
        const line = stripLineComment(rawLine);
        if (!line) {
            continue;
        }

        const depthBefore = braceDepth;

        if (skippingImport) {
            parenDepth += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
            if (parenDepth <= 0) {
                skippingImport = false;
            }
            continue;
        }

        if (skippingBody && depthBefore >= 1) {
            braceDepth += braceDelta(line);
            if (braceDepth === 0) {
                skippingBody = false;
            }
            continue;
        }

        if (depthBefore === 0 && /^package\s+\w+/.test(line)) {
            output.push(line);
            continue;
        }

        if (depthBefore === 0 && /^import\s/.test(line)) {
            if (line.includes('(')) {
                output.push('import ( /* ... */ )');
                parenDepth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
                if (parenDepth > 0) {
                    skippingImport = true;
                }
            } else {
                output.push(line);
            }
            continue;
        }

        if (depthBefore === 0 && /^(type|func|interface|const|var)\b/.test(line)) {
            if (/^type\s+\w+\s+(struct|interface)\s*\{/.test(line)) {
                const name = line.match(/^type\s+(\w+)/)?.[1] ?? 'Type';
                const kind = line.includes('interface') ? 'interface' : 'struct';
                output.push(`type ${name} ${kind} { /* ... */ }`);
                braceDepth += braceDelta(line);
                if (line.endsWith('{') || (line.includes('{') && !line.includes('}'))) {
                    skippingBody = true;
                }
                continue;
            }

            if (line.includes('{')) {
                output.push(line.replace(/\{[^}]*\}/, '{ /* ... */ }').replace(/\{\s*$/, '{ /* ... */ }'));
                braceDepth += braceDelta(line);
                if (line.endsWith('{') || (line.includes('{') && !line.includes('}'))) {
                    skippingBody = true;
                }
            } else {
                output.push(line);
            }
            continue;
        }

        braceDepth += braceDelta(line);
    }

    const header = filePath
        ? `// Oxygen Skeleton (Go): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

module.exports = { extractGoSkeleton };
