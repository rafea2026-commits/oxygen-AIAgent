'use strict';

/**
 * Objective-C skeleton — @interface, @implementation, methods, @property.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractObjcSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const lines = source.split(/\r?\n/);
    const output = [];

    for (const rawLine of lines) {
        let line = rawLine.replace(/\/\/.*$/, '').trim();
        if (!line) {
            continue;
        }

        if (/^#import\b|^#include\b|^@import\b/.test(line)) {
            output.push(line);
            continue;
        }

        if (/^@interface\b|^@implementation\b|^@protocol\b|^@end\b/.test(line)) {
            output.push(line.replace(/\{\s*$/, ' { /* ... */ }'));
            continue;
        }

        if (/^@property\b/.test(line)) {
            output.push(line);
            continue;
        }

        // Instance/class methods: - (ReturnType)name or + (ReturnType)name
        if (/^[+-]\s*\([^)]+\)\s*\w+/.test(line)) {
            output.push(line.replace(/\{\s*$/, ' { /* ... */ }').replace(/;\s*$/, ';'));
        }
    }

    const header = filePath ? `// Oxygen Skeleton (Objective-C): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractObjcSkeleton };
