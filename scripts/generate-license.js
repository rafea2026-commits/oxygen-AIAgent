#!/usr/bin/env node
'use strict';

/**
 * Generate a time-bound Oxygen license key (developer tool — do not ship to users).
 *
 * Usage:
 *   node scripts/generate-license.js              # +30 days from now
 *   node scripts/generate-license.js 30           # +N days
 *   node scripts/generate-license.js 2026-08-18   # hard expiry date
 */

const { generateLicense } = require('../src/license/validate');

function resolveExpiry(arg) {
    if (!arg) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    if (/^\d+$/.test(arg)) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(arg, 10));
        d.setHours(23, 59, 59, 999);
        return d;
    }

    const d = new Date(arg);
    if (Number.isNaN(d.getTime())) {
        throw new Error(`Invalid date or day count: ${arg}`);
    }
    if (!arg.includes('T')) {
        d.setHours(23, 59, 59, 999);
    }
    return d;
}

const arg = process.argv[2];
try {
    const expiry = resolveExpiry(arg);
    const key = generateLicense(expiry);
    console.log('');
    console.log('Oxygen license key generated');
    console.log('─'.repeat(50));
    console.log(`Expires: ${expiry.toISOString()}`);
    console.log(`Local:   ${expiry.toString()}`);
    console.log('');
    console.log(key);
    console.log('');
    console.log('Give this key to the user. They paste it when Oxygen prompts for activation.');
    console.log('');
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
}
