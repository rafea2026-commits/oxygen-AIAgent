'use strict';

const path = require('path');
const { detectLanguageGroup } = require('./language');
const { extractGenericSkeleton } = require('./extractors/generic');
const { extractCLikeSkeleton } = require('./extractors/cLike');
const { extractPythonSkeleton } = require('./extractors/python');
const { extractPhpSkeleton, extractRubySkeleton, extractMarkupSkeleton } = require('./extractors/misc');
const { extractGoSkeleton } = require('./extractors/go');
const { extractRustSkeleton } = require('./extractors/rust');
const { extractSqlSkeleton } = require('./extractors/sql');

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSkeleton(source, filePath) {
    const group = detectLanguageGroup(filePath);

    switch (group) {
        case 'cLike':
            return extractCLikeSkeleton(source, filePath);
        case 'python':
            return extractPythonSkeleton(source, filePath);
        case 'php':
            return extractPhpSkeleton(source, filePath);
        case 'ruby':
            return extractRubySkeleton(source, filePath);
        case 'markup':
            return extractMarkupSkeleton(source, filePath);
        case 'go':
            return extractGoSkeleton(source, filePath);
        case 'rust':
            return extractRustSkeleton(source, filePath);
        case 'sql':
            return extractSqlSkeleton(source, filePath);
        default:
            return extractGenericSkeleton(source, filePath);
    }
}

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSkeletonWithMeta(source, filePath) {
    const skeleton = extractSkeleton(source, filePath);
    const originalChars = source?.length ?? 0;
    const skeletonChars = skeleton.length;
    const ratio = originalChars > 0 ? skeletonChars / originalChars : 0;

    return {
        skeleton,
        originalChars,
        skeletonChars,
        compressionRatio: ratio,
        languageGroup: detectLanguageGroup(filePath),
        filePath: filePath ? path.basename(filePath) : 'unknown',
    };
}

module.exports = { extractSkeleton, extractSkeletonWithMeta };
