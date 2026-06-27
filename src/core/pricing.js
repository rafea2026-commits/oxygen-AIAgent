'use strict';

/**
 * USD per 1M tokens — tuned for typical agent context (input-heavy savings).
 * @type {Record<string, { label: string, inputPerMillion: number, outputPerMillion: number }>}
 */
const PRICING_PRESETS = {
    composer: {
        label: 'Cursor Composer (~2025)',
        inputPerMillion: 1.25,
        outputPerMillion: 6.0,
    },
    gpt4o: {
        label: 'GPT-4o',
        inputPerMillion: 2.5,
        outputPerMillion: 10.0,
    },
    gpt4oMini: {
        label: 'GPT-4o mini',
        inputPerMillion: 0.15,
        outputPerMillion: 0.6,
    },
    claudeSonnet: {
        label: 'Claude Sonnet',
        inputPerMillion: 3.0,
        outputPerMillion: 15.0,
    },
    claudeHaiku: {
        label: 'Claude Haiku',
        inputPerMillion: 0.8,
        outputPerMillion: 4.0,
    },
    geminiFlash: {
        label: 'Gemini Flash',
        inputPerMillion: 0.1,
        outputPerMillion: 0.4,
    },
    deepseek: {
        label: 'DeepSeek Chat',
        inputPerMillion: 0.27,
        outputPerMillion: 1.1,
    },
    custom: {
        label: 'Custom',
        inputPerMillion: 2.5,
        outputPerMillion: 10.0,
    },
};

/**
 * @param {import('vscode').WorkspaceConfiguration} config
 */
function resolvePricing(config) {
    const presetKey = config.get('pricing.preset', 'composer');
    const base = PRICING_PRESETS[presetKey] ?? PRICING_PRESETS.composer;

    if (presetKey === 'custom') {
        return {
            preset: 'custom',
            label: 'Custom',
            inputPerMillion: config.get('pricing.inputPerMillion', 2.5),
            outputPerMillion: config.get('pricing.outputPerMillion', 10.0),
        };
    }

    return {
        preset: presetKey,
        label: base.label,
        inputPerMillion: base.inputPerMillion,
        outputPerMillion: base.outputPerMillion,
    };
}

/**
 * @param {number} tokens
 * @param {{ inputPerMillion: number, outputPerMillion?: number }} pricing
 * @param {'input' | 'output'} kind
 */
function tokensToDollars(tokens, pricing, kind = 'input') {
    const rate = kind === 'output'
        ? (pricing.outputPerMillion ?? pricing.inputPerMillion)
        : pricing.inputPerMillion;
    return (tokens / 1_000_000) * rate;
}

module.exports = {
    PRICING_PRESETS,
    resolvePricing,
    tokensToDollars,
};
