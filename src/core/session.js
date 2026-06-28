'use strict';

const { calculateSavings } = require('./tokens');
const { tokensToDollars } = require('./pricing');

class SessionTracker {
    /**
     * @param {{ inputPerMillion: number, outputPerMillion?: number, label?: string }} pricing
     */
    constructor(pricing) {
        this.pricing = pricing;
        this.totalSavedUSD = 0;
        this.totalSavedTokens = 0;
        /** @type {Map<string, number>} */
        this.fileSavingsUSD = new Map();
        /** @type {Map<string, number>} */
        this.fileSavedTokens = new Map();
        /** @type {Map<string, number>} */
        this.fileCompression = new Map();
    }

    setPricing(pricing) {
        this.pricing = pricing;
    }

    /**
     * Track minification savings when user runs Minify Selection.
     * @param {string} uri
     * @param {string} rawText
     * @param {string} cleanedText
     */
    recordMinify(uri, rawText, cleanedText) {
        const result = calculateSavings(rawText, cleanedText, this.pricing);
        this._applyDelta(uri, result.savedTokens, result.savedDollar);
        return result;
    }

    /**
     * Track skeleton compression savings (primary metric).
     * @param {string} uri
     * @param {string} rawText
     * @param {string} skeleton
     */
    recordSkeleton(uri, rawText, skeleton) {
        const result = calculateSavings(rawText, skeleton, this.pricing);
        this._applyDelta(uri, result.savedTokens, result.savedDollar);
        const ratio = rawText.length > 0 ? skeleton.length / rawText.length : 0;
        this.fileCompression.set(uri, ratio);
        return result;
    }

    /**
     * @param {string} uri
     * @param {number} newSavedTokens
     * @param {number} newSavedUSD
     */
    _applyDelta(uri, newSavedTokens, newSavedUSD) {
        const prevTokens = this.fileSavedTokens.get(uri) ?? 0;
        const prevUSD = this.fileSavingsUSD.get(uri) ?? 0;
        const deltaTokens = newSavedTokens - prevTokens;
        const deltaUSD = newSavedUSD - prevUSD;

        if (deltaTokens > 0) {
            this.totalSavedTokens += deltaTokens;
        } else if (deltaTokens < 0) {
            this.totalSavedTokens = Math.max(0, this.totalSavedTokens + deltaTokens);
        }

        if (deltaUSD > 0) {
            this.totalSavedUSD += deltaUSD;
        } else if (deltaUSD < 0) {
            this.totalSavedUSD = Math.max(0, this.totalSavedUSD + deltaUSD);
        }

        this.fileSavedTokens.set(uri, newSavedTokens);
        this.fileSavingsUSD.set(uri, newSavedUSD);
    }

    getTotalSavedUSD() {
        return this.totalSavedUSD;
    }

    getTotalSavedTokens() {
        return Math.max(0, this.totalSavedTokens);
    }

    getPricingLabel() {
        return this.pricing.label ?? 'Custom';
    }

    getCompression(uri) {
        return this.fileCompression.get(uri);
    }

    reset() {
        this.totalSavedUSD = 0;
        this.totalSavedTokens = 0;
        this.fileSavingsUSD.clear();
        this.fileSavedTokens.clear();
        this.fileCompression.clear();
    }
}

module.exports = { SessionTracker };
