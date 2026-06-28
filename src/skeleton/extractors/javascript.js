'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractJavaScriptSkeleton = createBraceExtractor({
    label: 'JavaScript',
    headerLine: /^(?:import\s+|export\s+(?:\{|\*(?:\s+as\s+\w+)?|\w+)\s+from|require\s*\(|\/\/\/|<reference)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:export\s+)?(?:default\s+)?(?:@\w+(?:\([^)]*\))?\s+)*\b(?:class|interface|enum)\b/,
    topLevelDecl: /^(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\*?\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*[=(<])/,
    mainDecl: /\b(?:main|bootstrap)\s*\(/,
});

module.exports = { extractJavaScriptSkeleton };
