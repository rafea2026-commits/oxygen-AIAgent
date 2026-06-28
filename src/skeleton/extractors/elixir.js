'use strict';

const { createIndentExtractor } = require('./shared/indent');

const extractElixirSkeleton = createIndentExtractor({
    label: 'Elixir',
    commentPrefix: '#',
    headerLine: /^(defmodule|defprotocol|defimpl|defmacro|alias|import|use|require|@(?:moduledoc|doc|spec|type|behaviour|impl))\b/,
    blockStart: /^(defp?|defmacro|defmodule|defprotocol|defimpl|test|describe|setup)\b/,
    useEndKeyword: true,
    blockEnd: /^end\b/,
    formatBlockStart: (line) => {
        if (/\bdo\b/.test(line)) {
            return line.replace(/\s*do\b.*$/, ' do ... end');
        }
        return `${line} ... end`;
    },
});

module.exports = { extractElixirSkeleton };
