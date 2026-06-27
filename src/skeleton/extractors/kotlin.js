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
    if (!t || t.startsWith('/**') || t.startsWith('*')) {
        return '';
    }
    return t;
}

/**
 * @param {string} decl
 */
function formatFun(decl) {
    if (/\{/.test(decl) && /\}/.test(decl)) {
        return decl.replace(/\{[\s\S]*\}/, '{ /* ... */ }');
    }
    if (/\{\s*$/.test(decl)) {
        return decl.replace(/\{\s*$/, '{ /* ... */ }');
    }
    if (/=\s*/.test(decl)) {
        return decl.replace(/=\s*.+$/, '= /* ... */');
    }
    return decl;
}

/**
 * @param {string} decl
 */
function collapseDecl(decl) {
    if (decl.includes('}') && !decl.endsWith('{')) {
        return decl.replace(/\{[^}]*\}/, '{ /* ... */ }');
    }
    return decl.replace(/\{\s*$/, '{ /* ... */ }');
}

/**
 * Kotlin / Jetpack Compose skeleton — package, imports, collapsed declarations.
 * Skips all class/function bodies via brace-depth tracking.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractKotlinSkeleton(source, filePath) {
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

        if (depthBefore === 0 && (/^package\s+/.test(line) || /^import\s+/.test(line))) {
            output.push(line);
            continue;
        }

        if (/^@\w+/.test(line) && !/[({]/.test(line.replace(/^@\w+(\([^)]*\))?\s*/, ''))) {
            pending = pending ? `${pending} ${line}` : line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        const isTopLevelFun = /^(?:@\w+(?:\([^)]*\))?\s+)*(?:override\s+|private\s+|public\s+|internal\s+|suspend\s+)*fun\s+/.test(decl);
        const isTypeDecl = /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|abstract\s+|sealed\s+)*(?:data\s+)?(?:class|object|interface|enum\s+class)\b/.test(decl);

        if (depthBefore === 0 && isTopLevelFun) {
            output.push(formatFun(decl));
            braceDepth += braceDelta(decl);
            if (decl.includes('{') && !decl.includes('}')) {
                skippingBody = true;
            }
            continue;
        }

        if (depthBefore === 0 && isTypeDecl) {
            if (!decl.includes('{') && !decl.endsWith(';') && !decl.endsWith(')')) {
                pending = decl;
                continue;
            }
            if (!decl.includes('{') && decl.endsWith(')')) {
                output.push(`${decl} { /* ... */ }`);
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
        ? `// Oxygen Skeleton (Kotlin): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

module.exports = { extractKotlinSkeleton };
