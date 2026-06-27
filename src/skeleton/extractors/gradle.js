'use strict';

/**
 * Gradle / Gradle Kotlin DSL skeleton — plugins, android block, dependencies.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractGradleSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let braceDepth = 0;
    let inBlock = false;
    let blockName = '';

    const TOP_BLOCKS = /^(plugins|android|dependencies|buildscript|allprojects|subprojects|settings|kotlin|compose|flutter)\b/;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
            continue;
        }

        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;

        if (!inBlock && TOP_BLOCKS.test(trimmed)) {
            blockName = trimmed.match(/^(\w+)/)?.[1] ?? 'block';
            if (trimmed.includes('{')) {
                output.push(`${trimmed.replace(/\{\s*$/, '')} { /* ... */ }`);
                inBlock = true;
                braceDepth = openBraces - closeBraces;
                if (braceDepth <= 0) {
                    inBlock = false;
                }
            } else {
                output.push(trimmed);
            }
            continue;
        }

        if (inBlock) {
            braceDepth += openBraces - closeBraces;
            if (braceDepth <= 0) {
                inBlock = false;
            }
            continue;
        }

        // Top-level apply plugin / plugins id
        if (/^(apply\s+plugin|id\s*\(|implementation|api|compileOnly|classpath|testImplementation)\b/.test(trimmed)) {
            output.push(trimmed.replace(/\(\s*$/, '( /* ... */ )'));
        }
    }

    const header = filePath ? `// Oxygen Skeleton (Gradle): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractGradleSkeleton };
