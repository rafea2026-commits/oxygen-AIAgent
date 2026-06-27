'use strict';

const { calculateSavings, minifyText } = require('./tokens');
const { tokensToDollars } = require('./pricing');

class SessionTracker {
    /**
     * @param {{ inputPerMillion: number, outputPerMillion?: number, label?: string }} pricing
     */
    constructor(pricing) {
        this.pricing = pricing;
        /** @type {number} */
        this.totalSavedUSD = 0;
        /** @type {Map<string, number>} */
        this.fileSavings = new Map();
        /** @type {number} */
        this.purifyBonusUSD = 0;
        /** @type {number} */
        this.totalSavedTokens = 0;
    }

    /**
     * @param {{ inputPerMillion: number, outputPerMillion?: number }} pricing
     */
    setPricing(pricing) {
        this.pricing = pricing;
    }

    /**
     * @param {string} uri
     * @param {string} rawText
     */
    recordFile(uri, rawText) {
        const cleaned = minifyText(rawText);
        const result = calculateSavings(rawText, cleaned, this.pricing);
        const previous = this.fileSavings.get(uri) ?? 0;
        const delta = result.savedDollar - previous;

        if (delta > 0) {
            this.totalSavedUSD += delta;
            this.totalSavedTokens += result.savedTokens - (this._lastTokens?.get(uri) ?? 0);
        } else if (delta < 0) {
            this.totalSavedUSD = Math.max(0, this.totalSavedUSD + delta);
        }

        if (!this._lastTokens) {
            this._lastTokens = new Map();
        }
        this._lastTokens.set(uri, result.savedTokens);
        this.fileSavings.set(uri, result.savedDollar);
        return result;
    }

    /**
     * @param {number} bonusTokens
     */
    addPurifyBonus(bonusTokens) {
        const bonus = tokensToDollars(bonusTokens, this.pricing, 'input');
        this.purifyBonusUSD += bonus;
        this.totalSavedUSD += bonus;
        this.totalSavedTokens += bonusTokens;
        return bonus;
    }

    /**
     * @param {number} dollars
     */
    addExplicitSavings(dollars) {
        if (dollars > 0) {
            this.totalSavedUSD += dollars;
        }
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
}

module.exports = { SessionTracker };
