'use strict';

const { tokensToDollars } = require('./pricing');

/**
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (!text) {
        return 0;
    }
    return Math.ceil(text.length / 4);
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
};
