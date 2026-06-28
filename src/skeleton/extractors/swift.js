'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractSwiftSkeleton = createBraceExtractor({
    label: 'Swift',
    headerLine: /^import\s+/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|internal\s+|open\s+|final\s+)*(?:class|struct|enum|protocol|extension|actor)\b/,
    topLevelDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|static\s+|override\s+)*(?:func|init|subscript|var|let)\b/,
});

module.exports = { extractSwiftSkeleton };
