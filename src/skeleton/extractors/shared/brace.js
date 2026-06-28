'use strict';

const path = require('path');

/**
 * Remove string/template contents so `{` / `}` inside them are ignored.
 * @param {string} s
 */
function neutralizeStrings(s) {
    return s
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

/**
 * Count `{` / `}` delta (ignores strings and line comments).
 * @param {string} line
 * @param {{ stripHash?: boolean }} [opts]
 */
function braceDelta(line, opts = {}) {
    let s = line.replace(/\/\/.*$/, '');
    if (opts.stripHash) {
        s = s.replace(/#(?!!).*$/, '');
    }
    s = neutralizeStrings(s);
    return (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
}

/**
 * @param {string} line
 * @param {{ stripHash?: boolean }} [opts]
 */
function stripLineComment(line, opts = {}) {
    let t = line.replace(/\/\/.*$/, '');
    if (opts.stripHash) {
        t = t.replace(/#(?!!).*$/, '');
    }
    t = t.trim();
    if (!t || t.startsWith('/**') || t.startsWith('*') || t.startsWith('///')) {
        return '';
    }
    return t;
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
 * @param {string} decl
 */
function collapseInlineBody(decl) {
    if (/\{/.test(decl) && /\}/.test(decl)) {
        return decl.replace(/\{[\s\S]*\}/, '{ /* ... */ }');
    }
    if (/\{\s*$/.test(decl)) {
        return decl.replace(/\{\s*$/, '{ /* ... */ }');
    }
    if (/=>\s*/.test(decl)) {
        return decl.replace(/=>\s*.+$/, '=> /* ... */;');
    }
    if (/=\s*/.test(decl) && !/==|!=|<=|>=/.test(decl)) {
        return decl.replace(/=\s*.+$/, '= /* ... */');
    }
    return decl;
}

/**
 * @typedef {object} BraceSkeletonConfig
 * @property {string} label
 * @property {RegExp} headerLine
 * @property {RegExp} [annotationLine]
 * @property {RegExp} typeDecl
 * @property {RegExp} [topLevelDecl]
 * @property {RegExp} [mainDecl]
 * @property {boolean} [stripHashComments]
 * @property {(decl: string) => string | null} [mapTypeDecl]
 * @property {(decl: string) => string | null} [mapTopLevelDecl]
 * @property {(line: string) => boolean} [skipLine]
 * @property {(line: string) => string | null} [mapHeaderLine]
 */

/**
 * Brace-based skeleton extractor shared by C-family, JVM, mobile, and systems languages.
 * @param {string} source
 * @param {string | undefined} filePath
 * @param {BraceSkeletonConfig} config
 */
function extractBraceSkeleton(source, filePath, config) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let braceDepth = 0;
    let pending = '';
    let skippingBody = false;
    const commentOpts = { stripHash: config.stripHashComments === true };
    const annotationRe = config.annotationLine ?? /^@\w+/;

    for (const rawLine of lines) {
        const line = stripLineComment(rawLine, commentOpts);
        if (!line || (config.skipLine && config.skipLine(line))) {
            continue;
        }

        const depthBefore = braceDepth;

        if (skippingBody && depthBefore >= 1) {
            braceDepth += braceDelta(line, commentOpts);
            if (braceDepth === 0) {
                skippingBody = false;
            }
            continue;
        }

        if (depthBefore === 0 && config.headerLine.test(line)) {
            const mapped = config.mapHeaderLine ? config.mapHeaderLine(line) : line;
            if (mapped) {
                output.push(mapped);
            }
            continue;
        }

        if (annotationRe.test(line) && !/[({;]/.test(line.replace(/^@\w+(\([^)]*\))?\s*/, ''))) {
            pending = pending ? `${pending} ${line}` : line;
            continue;
        }

        const decl = pending ? `${pending} ${line}` : line;
        pending = '';

        if (config.mainDecl?.test(decl) && depthBefore === 0) {
            output.push(collapseInlineBody(decl));
            braceDepth += braceDelta(decl, commentOpts);
            if (decl.includes('{') && !decl.includes('}')) {
                skippingBody = true;
            }
            continue;
        }

        if (depthBefore === 0 && config.topLevelDecl?.test(decl)) {
            const mapped = config.mapTopLevelDecl ? config.mapTopLevelDecl(decl) : null;
            if (mapped !== null) {
                output.push(mapped);
            } else {
                output.push(collapseInlineBody(decl));
            }
            braceDepth += braceDelta(decl, commentOpts);
            if (decl.includes('{') && !decl.includes('}')) {
                skippingBody = true;
            }
            continue;
        }

        if (depthBefore === 0 && config.typeDecl.test(decl)) {
            if (!decl.includes('{') && !decl.endsWith(';') && !decl.endsWith(')')) {
                pending = decl;
                continue;
            }
            if (!decl.includes('{') && decl.endsWith(')')) {
                output.push(`${decl} { /* ... */ }`);
                continue;
            }

            let mapped = config.mapTypeDecl ? config.mapTypeDecl(decl) : null;
            if (mapped === null) {
                mapped = collapseDecl(decl);
            }
            if (mapped) {
                output.push(mapped);
            }
            braceDepth += braceDelta(decl, commentOpts);
            if (decl.endsWith('{') || (decl.includes('{') && !decl.includes('}'))) {
                skippingBody = true;
            }
            continue;
        }

        braceDepth += braceDelta(decl, commentOpts);
    }

    if (pending) {
        output.push(pending);
    }

    const header = filePath
        ? `// Oxygen Skeleton (${config.label}): ${path.basename(filePath)}\n`
        : '';
    return header + output.join('\n');
}

/**
 * @param {BraceSkeletonConfig} config
 */
function createBraceExtractor(config) {
    return (source, filePath) => extractBraceSkeleton(source, filePath, config);
}

module.exports = {
    extractBraceSkeleton,
    createBraceExtractor,
    braceDelta,
    stripLineComment,
    collapseDecl,
    collapseInlineBody,
};
