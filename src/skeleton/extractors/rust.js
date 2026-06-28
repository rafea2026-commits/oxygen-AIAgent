'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractRustSkeleton = createBraceExtractor({
    label: 'Rust',
    headerLine: /^(use|mod|pub\s+use|extern\s+crate|#!?\[)/,
    typeDecl: /^(?:pub\s+)?(?:async\s+)?(?:fn\s+\w+|struct\s+\w+|enum\s+\w+|union\s+\w+|trait\s+\w+|impl(?:<[^>]+>)?\s|type\s+\w+|const\s+\w+|static\s+\w+|macro_rules!\s+\w+)/,
    mapTypeDecl: (decl) => {
        if (/^macro_rules!/.test(decl)) {
            return decl.replace(/\{[^}]*\}/, '{ /* ... */ }').replace(/\{\s*$/, '{ /* ... */ }');
        }
        return null;
    },
});

module.exports = { extractRustSkeleton };
