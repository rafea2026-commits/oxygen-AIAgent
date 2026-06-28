'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractJavaSkeleton = createBraceExtractor({
    label: 'Java',
    headerLine: /^(package|import)\b/,
    annotationLine: /^@\w+/,
    typeDecl: /^(?:@\w+(?:\([^)]*\))?\s+)*(?:public\s+|private\s+|protected\s+|abstract\s+|final\s+|static\s+)*(?:class|interface|enum|record|@interface)\b/,
});

module.exports = { extractJavaSkeleton };
