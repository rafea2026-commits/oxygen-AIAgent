'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractCLikeSkeleton = createBraceExtractor({
    label: 'C-like',
    headerLine: /^(?:import\s+|export\s+(?:\{|\*(?:\s+as\s+\w+)?|\w+)\s+from|from\s+|require\s*\(|package\s+|namespace\s+|using\s+|#include|#pragma|\/\/\/|<reference)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:export\s+)?(?:default\s+)?(?:@\w+(?:\([^)]*\))?\s+)*(?:abstract\s+|sealed\s+|partial\s+|public\s+|private\s+|protected\s+|internal\s+|static\s+|async\s+)*\b(?:class|interface|enum|struct|union|type|namespace|module|declare\s+namespace)\b/,
    topLevelDecl: /^(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\*?\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*[=(<])/,
    mainDecl: /\bmain\s*\(/,
});

module.exports = { extractCLikeSkeleton };
