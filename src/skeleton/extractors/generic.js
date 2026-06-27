'use strict';

const SIGNATURE_KEYWORDS = /\b(import|export|from|require|package|module|namespace|using|include|typedef|struct|enum|union|interface|type|class|trait|impl|protocol|extension|object|companion|data|sealed|abstract|async|await|function|func|fn|def|let|const|var|val|public|private|protected|internal|static|final|override|virtual|native|synchronized|throws|@interface|@RestController|@Service|@Component|macro|delegate|operator|suspend|inline|extern|pub|mod|use|where|associatedtype|init|deinit|subscript|get|set|willSet|didSet)\b/i;

const SIGNATURE_LINE = /^(export\s+)?(default\s+)?(async\s+)?(function|class|interface|type|enum|struct|trait|impl|protocol|namespace|module)\b/i;

/**
 * @param {string} line
 */
function isSignatureLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
        return false;
    }
    if (SIGNATURE_LINE.test(trimmed)) {
        return true;
    }
    if (SIGNATURE_KEYWORDS.test(trimmed) && /[({;=:]/.test(trimmed)) {
        return true;
    }
    // Function-like: name(...) at start or after modifiers
    if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:[\w$.<>\[\],]+\s+)+[\w$.]+\s*\([^)]*\)\s*(?::\s*[\w<>\[\]|&.,\s$]+)?\s*[;{]?$/.test(trimmed)) {
        return true;
    }
    return false;
}

/**
 * Extract skeleton from any language using heuristics.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractGenericSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];
    let inBlockComment = false;
    let braceDepth = 0;
    let inBody = false;
    let pendingSignature = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Track block comments
        if (inBlockComment) {
            if (line.includes('*/')) {
                inBlockComment = false;
                line = line.slice(line.indexOf('*/') + 2);
            } else {
                continue;
            }
        }

        const blockStart = line.indexOf('/*');
        if (blockStart !== -1 && !line.includes('*/', blockStart + 2)) {
            inBlockComment = true;
            line = line.slice(0, blockStart);
        }
        line = line.replace(/\/\*[\s\S]*?\*\//g, '');
        line = line.replace(/\/\/.*$/, '');
        line = line.replace(/#(?!!).*$/, '');
        line = line.replace(/^\s*--(?!-).*$/, '');

        const trimmed = line.trim();
        if (!trimmed) {
            if (!inBody && pendingSignature) {
                output.push(pendingSignature);
                pendingSignature = '';
            }
            continue;
        }

        // Python / shell style body after colon at end of def/class
        const pythonBody = /:\s*$/.test(trimmed) && /^(class|def|async\s+def|if|elif|else|for|while|try|except|finally|with|match|case)\b/.test(trimmed);

        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;

        if (inBody) {
            braceDepth += openBraces - closeBraces;
            if (pythonBody && braceDepth <= 0) {
                // skip indented python body
            } else if (braceDepth <= 0 && closeBraces > 0) {
                inBody = false;
                braceDepth = 0;
                if (pendingSignature) {
                    output.push(pendingSignature + ' { /* ... */ }');
                    pendingSignature = '';
                }
            }
            continue;
        }

        if (isSignatureLine(trimmed) || (pendingSignature && !trimmed.endsWith('{') && !trimmed.endsWith(':'))) {
            if (pendingSignature) {
                output.push(pendingSignature);
            }
            pendingSignature = trimmed;

            if (trimmed.endsWith('{') || pythonBody) {
                output.push(trimmed.endsWith('{') ? trimmed.replace(/\{\s*$/, '{ /* ... */ }') : trimmed + ' ...');
                pendingSignature = '';
                if (trimmed.endsWith('{')) {
                    inBody = true;
                    braceDepth = openBraces - closeBraces;
                } else {
                    inBody = true;
                    braceDepth = 1;
                }
            } else if (trimmed.endsWith(';')) {
                output.push(trimmed);
                pendingSignature = '';
            }
        } else if (/^import\b|^from\b|^using\b|^#include\b|^require\b|^package\b|^use\b|^mod\b/.test(trimmed)) {
            output.push(trimmed);
        }
    }

    if (pendingSignature) {
        output.push(pendingSignature);
    }

    const header = filePath ? `// Oxygen Skeleton: ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractGenericSkeleton, isSignatureLine };
