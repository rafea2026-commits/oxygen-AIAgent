'use strict';

const { extractGenericSkeleton } = require('./generic');

/**
 * C-like languages share brace-based structure; generic heuristics work well.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractCLikeSkeleton(source, filePath) {
    return extractGenericSkeleton(source, filePath);
}

module.exports = { extractCLikeSkeleton };
