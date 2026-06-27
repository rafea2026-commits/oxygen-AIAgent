'use strict';

/**
 * YAML skeleton — pubspec.yaml, CI configs, Flutter/Android manifests.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractYamlSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    const seenTopKeys = new Set();

    for (const rawLine of lines) {
        const line = rawLine.replace(/#.*$/, '');
        const trimmed = line.trimEnd();
        if (!trimmed) {
            continue;
        }

        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;

        // Top-level and first-level keys only (keep skeleton compact)
        if (indent <= 2) {
            const keyMatch = trimmed.match(/^([\w@.-]+):\s*(.*)$/);
            if (keyMatch) {
                const key = keyMatch[1];
                const value = keyMatch[2];
                if (indent === 0) {
                    if (seenTopKeys.has(key)) {
                        continue;
                    }
                    seenTopKeys.add(key);
                }
                if (value && !value.startsWith('|') && !value.startsWith('>')) {
                    output.push(`${' '.repeat(indent)}${key}: ${value}`);
                } else {
                    output.push(`${' '.repeat(indent)}${key}: ...`);
                }
            }
        }
    }

    const header = filePath ? `# Oxygen Skeleton (YAML): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractYamlSkeleton };
