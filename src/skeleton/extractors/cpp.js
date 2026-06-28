'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractCppSkeleton = createBraceExtractor({
    label: 'C++',
    headerLine: /^(#include|#pragma|#ifndef|#define|#endif|#if|#else|#elif|using\s+namespace)\b/,
    typeDecl: /^(?:template\s*<[^>]*>\s*)*(?:class|struct|enum\s+class|enum|union|namespace)\b/,
    topLevelDecl: /^(?:template\s*<[^>]*>\s*)*(?:virtual\s+|static\s+|inline\s+|constexpr\s+|explicit\s+|friend\s+|extern\s+)*[\w:~<>,\s*&]+\s+\w+\s*\(/,
    mainDecl: /\b(?:main|WinMain|wWinMain)\s*\(/,
});

module.exports = { extractCppSkeleton };
