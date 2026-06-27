'use strict';

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
        // Fallback: first-level keys via regex
        const keys = [...source.matchAll(/"([\w@.-]+)"\s*:/g)].map((m) => m[1]);
        const unique = [...new Set(keys)].slice(0, 40);
        const header = filePath ? `// Oxygen Skeleton (JSON): ${filePath}\n` : '';
        return header + unique.map((k) => `"${k}": ...`).join('\n');
    }

    const lines = [];
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'object' && value !== null) {
                lines.push(`"${key}": { /* ${Array.isArray(value) ? value.length + ' items' : Object.keys(value).length + ' keys'} */ }`);
            } else {
                lines.push(`"${key}": ${JSON.stringify(value)}`);
            }
        }
    }

    const header = filePath ? `// Oxygen Skeleton (JSON): ${filePath}\n` : '';
    return header + lines.join('\n');
}

module.exports = { extractJsonSkeleton };
