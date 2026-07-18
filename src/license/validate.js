'use strict';

const CryptoJS = require('crypto-js');

/** Global secure encryption key used for local cryptographic validation. */
const SECRET_SALT = 'My_Super_Secret_Salt_Key_2026';

/**
 * Decrypt and validate a time-bound AES license key.
 * Payload format: ISO date string (expiry), e.g. "2026-08-18T23:59:59.999Z"
 * @param {string} key
 * @returns {boolean}
 */
function validateLicense(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(key.trim(), SECRET_SALT);
        const decryptedDateStr = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedDateStr) {
            return false;
        }

        const expiryDate = new Date(decryptedDateStr);
        if (Number.isNaN(expiryDate.getTime())) {
            return false;
        }

        return new Date() < expiryDate;
    } catch {
        return false;
    }
}

/**
 * Read expiry date from a valid license (for status / log). Returns null if invalid.
 * @param {string} key
 * @returns {Date | null}
 */
function getLicenseExpiry(key) {
    if (!validateLicense(key)) {
        return null;
    }
    try {
        const bytes = CryptoJS.AES.decrypt(key.trim(), SECRET_SALT);
        const decryptedDateStr = bytes.toString(CryptoJS.enc.Utf8);
        return new Date(decryptedDateStr);
    } catch {
        return null;
    }
}

/**
 * Encrypt an expiry ISO date into a license key (developer tooling).
 * @param {Date | string} expiry
 * @returns {string}
 */
function generateLicense(expiry) {
    const date = expiry instanceof Date ? expiry : new Date(expiry);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid expiry date');
    }
    return CryptoJS.AES.encrypt(date.toISOString(), SECRET_SALT).toString();
}

module.exports = {
    SECRET_SALT,
    validateLicense,
    getLicenseExpiry,
    generateLicense,
};
