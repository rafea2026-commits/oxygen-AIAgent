'use strict';

/**
 * @param {import('vscode')} vscode
 * @param {import('../core/session').SessionTracker} session
 */
function createStatusBar(vscode, session) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.command = 'oxygen.showDashboard';
    item.tooltip = 'Oxygen — session savings (click for details)';

    function render() {
        const total = session.getTotalSavedUSD();
        const model = session.getPricingLabel().split(' ')[0];
        item.text = `$(database) O₂: $${total.toFixed(4)} · ${model}`;
        item.tooltip = `Oxygen — saved ~$${total.toFixed(4)} (${session.getPricingLabel()})\nClick for dashboard`;
    }

    render();

    return { item, render };
}

module.exports = { createStatusBar };
