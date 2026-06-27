'use strict';

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractRustSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let inBlockComment = false;

    for (const rawLine of lines) {
        let line = rawLine;

        if (inBlockComment) {
            if (line.includes('*/')) {
                inBlockComment = false;
                line = line.slice(line.indexOf('*/') + 2);
            } else {
                continue;
            }
        }

        if (line.includes('/*') && !line.includes('*/')) {
            inBlockComment = true;
            line = line.slice(0, line.indexOf('/*'));
        }

        line = line.replace(/\/\/.*$/, '').trim();
        if (!line) {
            continue;
        }

        if (/^(use|mod|pub\s+use|extern\s+crate)\b/.test(line)) {
            output.push(line.replace(/;\s*$/, ';'));
            continue;
        }

        if (/^(pub\s+)?(async\s+)?fn\s+\w+/.test(line)) {
            output.push(line.replace(/\{\s*$/, '{ /* ... */ }'));
            continue;
        }

        if (/^(pub\s+)?(struct|enum|union|trait|type|impl|const|static|macro_rules!)\b/.test(line)) {
            if (line.includes('{')) {
                const sig = line.match(/^((?:pub\s+)?(?:struct|enum|trait|impl)\s+[\w<>,\s]+)/)?.[1]
                    ?? line.replace(/\{\s*$/, '');
                output.push(`${sig.trim()} { /* ... */ }`);
            } else {
                output.push(line);
            }
            continue;
        }
    }

    const header = filePath ? `// Oxygen Skeleton (Rust): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractRustSkeleton };
