'use strict';

const { createBraceExtractor } = require('./shared/brace');

const braceExtract = createBraceExtractor({
    label: 'Kotlin',
    headerLine: /^(package|import)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|abstract\s+|sealed\s+)*(?:data\s+)?(?:class|object|interface|enum\s+class)\b/,
    topLevelDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:override\s+|private\s+|public\s+|internal\s+|suspend\s+)*fun\s+/,
    mapTypeDecl(decl) {
        const dataMatch = decl.match(
            /^(?:@\w+(?:\([^)]*\))?\s+)*(?:data\s+)class\s+(\w+)/
        );
        if (dataMatch && decl.includes('(')) {
            const params = decl.match(/\(([^)]*)\)/)?.[1] ?? '';
            const count = params.split(',').filter((p) => p.trim()).length;
            return `data class ${dataMatch[1]}(/* ${count} props */)`;
        }
        return null;
    },
    mapTopLevelDecl(decl) {
        const normalized = decl.replace(/\s+/g, ' ').trim();
        if (/^@Composable\s+fun\s+\w+/.test(normalized)) {
            const sig = normalized.match(/^(@Composable\s+)?fun\s+\w+\s*(\([^)]*\))?/)?.[0];
            if (sig) {
                return `${sig.trim()} { /* ... */ }`;
            }
        }
        if (/\)\s*=/.test(normalized) && !normalized.includes('{')) {
            return `${normalized.split('=')[0].trim()} { /* ... */ }`;
        }
        return null;
    },
});

/**
 * Collapse long import blocks into a single summary line.
 * @param {string} skeleton
 */
function collapseImportBlocks(skeleton) {
    const lines = skeleton.split('\n');
    const output = [];
    /** @type {string[]} */
    let imports = [];

    function flushImports() {
        if (imports.length === 0) {
            return;
        }
        if (imports.length > 5) {
            output.push(`import ... (${imports.length} imports)`);
        } else {
            output.push(...imports);
        }
        imports = [];
    }

    for (const line of lines) {
        if (line.startsWith('import ')) {
            imports.push(line);
        } else {
            flushImports();
            output.push(line);
        }
    }
    flushImports();
    return output.join('\n');
}

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractKotlinSkeleton(source, filePath) {
    return collapseImportBlocks(braceExtract(source, filePath));
}

module.exports = { extractKotlinSkeleton };
