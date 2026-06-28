'use strict';

const { createIndentExtractor } = require('./shared/indent');

const extractPythonSkeleton = createIndentExtractor({
    label: 'Python',
    commentPrefix: '#',
    headerLine: /^(import|from|__future__|# type:|if\s+TYPE_CHECKING:|@)/,
    blockStart: /^(async\s+def|def|class)\b/,
    formatBlockStart: (line) => line.replace(/:\s*$/, ': ...'),
});

module.exports = { extractPythonSkeleton };
