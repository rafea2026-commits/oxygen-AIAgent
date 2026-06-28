'use strict';

const { createBraceExtractor } = require('./shared/brace');

const extractObjcSkeleton = createBraceExtractor({
    label: 'Objective-C',
    headerLine: /^(#import|#include|@import|@property)\b/,
    typeDecl: /^@(?:interface|implementation|protocol)\b/,
    topLevelDecl: /^[+-]\s*\([^)]+\)\s*\w+/,
    mapTypeDecl: (decl) => {
        if (decl.includes('{')) {
            return decl.replace(/\{[^}]*\}/, '{ /* ... */ }').replace(/\{\s*$/, '{ /* ... */ }');
        }
        if (/^@(?:interface|implementation|protocol)\b/.test(decl) && !decl.includes('{')) {
            return `${decl} { /* ... */ }`;
        }
        return null;
    },
    mapTopLevelDecl: (decl) => decl.replace(/\{[^}]*\}/, '{ /* ... */ }').replace(/\{\s*$/, '{ /* ... */ }'),
    skipLine: (line) => line === '@end',
});

module.exports = { extractObjcSkeleton };
