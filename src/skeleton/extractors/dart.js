'use strict';

const path = require('path');

/**
 * Count `{` / `}` delta on a line (ignores strings and // comments).
 * @param {string} line
 */
function braceDelta(line) {
    let s = line.replace(/\/\/.*$/, '');
    s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
    s = s.replace(/'(?:\\.|[^'\\])*'/g, "''");
    return (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
}

/**
 * @param {string} line
 */
function stripComment(line) {
    const t = line.replace(/\/\/.*$/, '').trim();
    if (!t || t.startsWith('///') || t.startsWith('/**') || t.startsWith('*')) {
        return '';
    }
    return t;
}

/**
 * @param {string} decl
 */
function formatMember(decl) {
    if (/\{/.test(decl) && /\}/.test(decl)) {
        return decl.replace(/\{[\s\S]*\}/, '{ /* ... */ }');
    }
    if (/\{\s*$/.test(decl)) {
        return decl.replace(/\{\s*$/, '{ /* ... */ }');
    }
    if (/=>\s*/.test(decl)) {
        return decl.replace(/=>\s*.+$/, '=> /* ... */;');
    }
    return decl;
}

/**
 * @param {string} decl
 */
function collapseDecl(decl) {
    if (/^enum\s+\w+/.test(decl) && decl.includes('}')) {
        return decl.replace(/\{[^}]*\}/, '{ /* ... */ }');
    }
    if (decl.includes('}') && !decl.endsWith('{')) {
        return decl.replace(/\{[^}]*\}/, '{ /* ... */ }');
    }
    return decl.replace(/\{\s*$/, '{ /* ... */ }');
}

/**
 * Dart / Flutter skeleton — imports + collapsed type declarations only.
 * Skips all class/method bodies via brace-depth tracking.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractDartSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let braceDepth = 0;
    let pending = '';
    let skippingBody = false;

    for (const rawLine of lines) {
        const line = stripComment(rawLine);
        if (!line) {
            continue;
        }

        const depthBefore = braceDepth;

        if (skippingBody && depthBefore >= 1) {
            braceDepth += braceDelta(line);
            if (braceDepth === 0) {
                skippingBody = false;
            }
            continue;
        }

        if (depthBefore === 0 && /^(import|export|part|part of|library)\b/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^@\w+/.test(line) && !/[({;]/.test(line.replace(/^@\w+(\([^)]*\))?\s*/, ''))) {
            pending = pending ? `${pending} ${line}` : line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (depthBefore === 0 && /^void\s+main\s*\(/.test(decl)) {
            output.push(formatMember(decl));
            braceDepth += braceDelta(decl);
            if (decl.includes('{') && !decl.includes('}')) {
                skippingBody = true;
            }
            continue;
        }

        const isTypeDecl = /^(?:@\w+(?:\([^)]*\))?\s+)*(?:abstract\s+)?(?:class|mixin|extension|enum|typedef)\b/.test(decl);

        if (depthBefore === 0 && isTypeDecl) {
            if (!decl.includes('{') && !decl.endsWith(';')) {
                pending = decl;
                continue;
            }
            output.push(collapseDecl(decl));
            braceDepth += braceDelta(decl);
            if (decl.endsWith('{') || (decl.includes('{') && !decl.includes('}'))) {
                skippingBody = true;
            }
            continue;
        }

        braceDepth += braceDelta(decl);
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath
        ? `// Oxygen Skeleton (Dart/Flutter): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

module.exports = { extractDartSkeleton };
