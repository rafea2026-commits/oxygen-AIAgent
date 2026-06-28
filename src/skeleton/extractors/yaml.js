'use strict';

const LIST_SECTIONS = new Set([
    'dependencies',
    'dev_dependencies',
    'dependency_overrides',
    'flutter',
]);

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
    let listSection = null;
    /** @type {string[]} */
    let listKeys = [];

    function flushListSection() {
        if (!listSection) {
            return;
        }
        if (listKeys.length > 0) {
            output.push(`${listSection}: [${listKeys.join(', ')}]`);
        } else {
            output.push(`${listSection}: ...`);
        }
        listSection = null;
        listKeys = [];
    }

    for (const rawLine of lines) {
        const line = rawLine.replace(/#.*$/, '');
        const trimmed = line.trimEnd();
        if (!trimmed) {
            continue;
        }

        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;

        if (indent === 0) {
            flushListSection();
            const keyMatch = trimmed.match(/^([\w@.-]+):\s*(.*)$/);
            if (!keyMatch) {
                continue;
            }
            const key = keyMatch[1];
            const value = keyMatch[2];
            if (seenTopKeys.has(key)) {
                continue;
            }
            seenTopKeys.add(key);

            if (LIST_SECTIONS.has(key) && !value) {
                listSection = key;
                continue;
            }

            if (value && !value.startsWith('|') && !value.startsWith('>')) {
                output.push(`${key}: ${value}`);
            } else if (value) {
                output.push(`${key}: ...`);
            } else {
                output.push(`${key}:`);
            }
            continue;
        }

        if (listSection && indent > 0) {
            const childKey = trimmed.trim().match(/^([\w@.-]+):/)?.[1];
            if (childKey) {
                listKeys.push(childKey);
            }
            continue;
        }

        if (indent <= 2) {
            const keyMatch = trimmed.match(/^([\w@.-]+):\s*(.*)$/);
            if (keyMatch) {
                const key = keyMatch[1];
                const value = keyMatch[2];
                if (value && !value.startsWith('|') && !value.startsWith('>')) {
                    output.push(`${' '.repeat(indent)}${key}: ${value}`);
                } else {
                    output.push(`${' '.repeat(indent)}${key}: ...`);
                }
            }
        }
    }

    flushListSection();

    const header = filePath ? `# Oxygen Skeleton (YAML): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractYamlSkeleton };
