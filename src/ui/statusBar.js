'use strict';

/**
 * @param {import('vscode')} vscode
 * @param {import('../core/session').SessionTracker} session
 */
function createStatusBar(vscode, session) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    item.name = 'Oxygen Token Saver';
    item.command = 'oxygen.showLog';

    function render(activeTokens, isLarge) {
        const tokens = session.getTotalSavedTokens();
        const usd = session.getTotalSavedUSD();
        const savedK = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;

        if (tokens === 0 && !activeTokens) {
            item.text = 'O2 Oxygen | open a code file';
        } else if (isLarge) {
            item.text = `O2 Oxygen | -${savedK} tok | file large`;
        } else {
            item.text = `O2 Oxygen | -${savedK} tok | $${usd.toFixed(3)} saved`;
        }

        item.tooltip = [
            'Oxygen Token Saver',
            `Saved this session: ~${tokens.toLocaleString()} tokens ($${usd.toFixed(4)})`,
            activeTokens ? `Active file: ~${activeTokens.toLocaleString()} tokens` : 'Open a source file to start tracking',
            'Click for log | Ctrl+Shift+P -> Oxygen commands',
        ].filter(Boolean).join('\n');
    }

    render(undefined, false);
    return { item, render };
}

module.exports = { createStatusBar };
