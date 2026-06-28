'use strict';

const KEY_LIST_SECTIONS = new Set([
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
    'scripts',
]);

/**
 * @param {string} key
 * @param {unknown} value
 */
function formatJsonEntry(key, value) {
    if (KEY_LIST_SECTIONS.has(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const names = Object.keys(value);
        if (names.length > 6) {
            return `"${key}": [${names.slice(0, 6).join(', ')}, ... +${names.length - 6}]`;
        }
        return `"${key}": [${names.join(', ')}]`;
    }
    if (typeof value === 'object' && value !== null) {
        const count = Array.isArray(value) ? value.length : Object.keys(value).length;
        const kind = Array.isArray(value) ? `${count} items` : `${count} keys`;
        return `"${key}": { /* ${kind} */ }`;
    }
    if (typeof value === 'string' && value.length > 48) {
        return `"${key}": "${value.slice(0, 32)}..."`;
    }
    return `"${key}": ${JSON.stringify(value)}`;
}

/**
 * JSON skeleton — ARB localization, app.config, package manifests.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractJsonSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    let parsed;
    try {
        parsed = JSON.parse(source);
    } catch {
        const keys = [...source.matchAll(/"([\w@.-]+)"\s*:/g)].map((m) => m[1]);
        const unique = [...new Set(keys)].slice(0, 40);
        const header = filePath ? `// Oxygen Skeleton (JSON): ${filePath}\n` : '';
        return header + unique.map((k) => `"${k}": ...`).join('\n');
    }

    const lines = [];
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
            lines.push(formatJsonEntry(key, value));
        }
    }

    const header = filePath ? `// Oxygen Skeleton (JSON): ${filePath}\n` : '';
    return header + lines.join('\n');
}

module.exports = { extractJsonSkeleton };
