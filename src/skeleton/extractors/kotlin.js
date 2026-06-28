'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractKotlinSkeleton = createBraceExtractor({
    label: 'Kotlin',
    headerLine: /^(package|import)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|abstract\s+|sealed\s+)*(?:data\s+)?(?:class|object|interface|enum\s+class)\b/,
    topLevelDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:override\s+|private\s+|public\s+|internal\s+|suspend\s+)*fun\s+/,
});

module.exports = { extractKotlinSkeleton };
