'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractDartSkeleton = createBraceExtractor({
    label: 'Dart/Flutter',
    headerLine: /^(import|export|part|part of|library)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:abstract\s+)?(?:class|mixin|extension|enum|typedef)\b/,
    mainDecl: /^void\s+main\s*\(/,
});

module.exports = { extractDartSkeleton };
