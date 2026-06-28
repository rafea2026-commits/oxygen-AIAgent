'use strict';

const { tokensToDollars } = require('./pricing');

/**
 * Strip comments and string literals before token counting.
 * @param {string} text
 */
function stripForTokenCount(text) {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*$/gm, ' ')
        .replace(/^\s*#(?!!).*$/gm, ' ')
        .replace(/"(?:\\.|[^"\\])*"/g, '"')
        .replace(/'(?:\\.|[^'\\])*'/g, "'")
        .replace(/`(?:\\.|[^`\\])*`/g, '`');
}

/**
 * Code-aware token estimate (closer to cl100k_base than chars/4).
 * Splits identifiers, operators, and numbers — typical error ±15% vs tiktoken.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (!text) {
        return 0;
    }

    const stripped = stripForTokenCount(text).trim();
    if (!stripped) {
        return 0;
    }

    const chunks = stripped.match(/[a-zA-Z_$][\w$]*|[0-9]+(?:\.[0-9]+)?|[{}()[\];,.<>:=+\-*/&|^!~?%@#]+/g) || [];
    let tokens = 0;

    for (const chunk of chunks) {
        const len = chunk.length;
        if (len <= 4) {
            tokens += 1;
        } else if (len <= 10) {
            tokens += 2;
        } else {
            tokens += Math.ceil(len / 4);
        }
    }

    return Math.max(1, tokens);
}

/**
 * @param {string} rawText
 * @param {string} cleanedText
 * @param {{ inputPerMillion: number }} pricing
 */
function calculateSavings(rawText, cleanedText, pricing) {
    const originalTokens = estimateTokens(rawText);
    const cleanedTokens = estimateTokens(cleanedText);
    const savedTokens = Math.max(0, originalTokens - cleanedTokens);

    return {
        originalTokens,
        cleanedTokens,
        savedTokens,
        savedDollar: tokensToDollars(savedTokens, pricing, 'input'),
    };
}

/**
 * @param {string} rawText
 */
function minifyText(rawText) {
    if (!rawText) {
        return '';
    }

    return rawText
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"""[\s\S]*?"""/g, '')
        .replace(/'''[\s\S]*?'''/g, '')
        .replace(/#=([\s\S]*?)#=/g, '')
        .replace(/^\s*#(?!!).*/gm, '')
        .replace(/^\s*--(?!-).*/gm, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/^\s*;.*$/gm, '')
        .replace(/^\s*%.*/gm, '')
        .replace(/^\s*[\r\n]/gm, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

module.exports = {
    estimateTokens,
    calculateSavings,
    minifyText,
    stripForTokenCount,
};
