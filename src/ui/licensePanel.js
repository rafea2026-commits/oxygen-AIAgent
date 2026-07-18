'use strict';

const vscode = require('vscode');
const { validateLicense, getLicenseExpiry } = require('../license/validate');

/** @type {vscode.WebviewPanel | undefined} */
let activePanel;

/**
 * HTML for the activation form (field + Activate button).
 * @param {vscode.Webview} webview
 * @param {{ title?: string, hint?: string, status?: string }} [opts]
 */
function getActivationHtml(webview, opts = {}) {
    const title = opts.title ?? 'Oxygen Activation';
    const hint = opts.hint ?? 'Paste your time-bound license key below, then click Activate.';
    const status = opts.status ?? '';
    const csp = [
        `default-src 'none'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src ${webview.cspSource} 'unsafe-inline'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-input-border, rgba(127,127,127,.4));
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --btn-bg: var(--vscode-button-background);
      --btn-fg: var(--vscode-button-foreground);
      --btn-hover: var(--vscode-button-hoverBackground);
      --err: var(--vscode-errorForeground, #f14c4c);
      --ok: var(--vscode-testing-iconPassed, #3fb950);
      --muted: var(--vscode-descriptionForeground);
    }
    body {
      margin: 0;
      padding: 20px 18px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg);
      background: var(--bg);
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .hint {
      color: var(--muted);
      margin: 0 0 18px;
      line-height: 1.45;
    }
    label {
      display: block;
      font-weight: 500;
      margin-bottom: 6px;
    }
    textarea {
      width: 100%;
      min-height: 88px;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--input-bg);
      color: var(--input-fg);
      font-family: var(--vscode-editor-font-family, Consolas, monospace);
      font-size: 12px;
      resize: vertical;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    button#activate {
      margin-top: 14px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      background: var(--btn-bg);
      color: var(--btn-fg);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    button#activate:hover { background: var(--btn-hover); }
    button#activate:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .msg {
      margin-top: 12px;
      min-height: 1.2em;
      font-size: 12px;
    }
    .msg.error { color: var(--err); }
    .msg.ok { color: var(--ok); }
    .status-box {
      margin-bottom: 16px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--vscode-textBlockQuote-background, transparent);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="hint">${hint}</p>
  ${status ? `<div class="status-box">${status}</div>` : ''}
  <label for="key">License key</label>
  <textarea id="key" placeholder="Paste license key here..." spellcheck="false"></textarea>
  <button type="button" id="activate">Activate</button>
  <div class="msg" id="msg"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const keyEl = document.getElementById('key');
    const btn = document.getElementById('activate');
    const msg = document.getElementById('msg');

    function setMsg(text, kind) {
      msg.textContent = text || '';
      msg.className = 'msg' + (kind ? ' ' + kind : '');
    }

    btn.addEventListener('click', () => {
      const key = (keyEl.value || '').trim();
      if (!key) {
        setMsg('Please paste a license key first.', 'error');
        return;
      }
      btn.disabled = true;
      setMsg('Validating...', '');
      vscode.postMessage({ type: 'activate', key });
    });

    window.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'result') {
        btn.disabled = false;
        setMsg(data.message || '', data.ok ? 'ok' : 'error');
      }
    });
  </script>
</body>
</html>`;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {{ reason?: string }} [opts]
 */
function openLicensePanel(context, opts = {}) {
    if (activePanel) {
        activePanel.reveal(vscode.ViewColumn.Active);
        return activePanel;
    }

    const panel = vscode.window.createWebviewPanel(
        'oxygenLicense',
        'Oxygen — Activation',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );
    activePanel = panel;

    const savedKey = vscode.workspace.getConfiguration('oxygen').get('licenseKey', '');
    const expiry = savedKey ? getLicenseExpiry(savedKey) : null;
    const status = expiry
        ? `Current license valid until <strong>${expiry.toLocaleString()}</strong>. Enter a new key to renew.`
        : (opts.reason ? `<strong>Status:</strong> ${opts.reason}` : 'Extension is locked until activated.');

    panel.webview.html = getActivationHtml(panel.webview, {
        title: 'Oxygen Activation',
        hint: 'Enter your product license key in the field below, then press Activate.',
        status,
    });

    panel.webview.onDidReceiveMessage(async (message) => {
        if (message?.type !== 'activate') {
            return;
        }
        const key = String(message.key || '').trim();
        if (!validateLicense(key)) {
            panel.webview.postMessage({
                type: 'result',
                ok: false,
                message: 'Invalid or expired license key. Access denied.',
            });
            return;
        }

        await vscode.workspace.getConfiguration('oxygen').update(
            'licenseKey',
            key,
            vscode.ConfigurationTarget.Global
        );
        const until = getLicenseExpiry(key);
        panel.webview.postMessage({
            type: 'result',
            ok: true,
            message: `Activation successful! Valid until ${until ? until.toLocaleDateString() : 'expiry'}. Reloading...`,
        });
        setTimeout(() => {
            void vscode.commands.executeCommand('workbench.action.reloadWindow');
        }, 600);
    }, undefined, context.subscriptions);

    panel.onDidDispose(() => {
        activePanel = undefined;
    }, undefined, context.subscriptions);

    return panel;
}

/**
 * Sidebar Activation view (field + Activate button).
 * @param {import('vscode').ExtensionContext} context
 */
function registerLicenseSidebar(context) {
    const provider = {
        /**
         * @param {vscode.WebviewView} webviewView
         */
        resolveWebviewView(webviewView) {
            webviewView.webview.options = { enableScripts: true };

            const savedKey = vscode.workspace.getConfiguration('oxygen').get('licenseKey', '');
            const expiry = savedKey ? getLicenseExpiry(savedKey) : null;
            const status = expiry
                ? `Licensed until <strong>${expiry.toLocaleString()}</strong>`
                : 'Locked — enter a license key to unlock Oxygen.';

            webviewView.webview.html = getActivationHtml(webviewView.webview, {
                title: 'Activate Oxygen',
                hint: 'Paste your license key, then click Activate.',
                status,
            });

            webviewView.webview.onDidReceiveMessage(async (message) => {
                if (message?.type !== 'activate') {
                    return;
                }
                const key = String(message.key || '').trim();
                if (!validateLicense(key)) {
                    webviewView.webview.postMessage({
                        type: 'result',
                        ok: false,
                        message: 'Invalid or expired license key.',
                    });
                    return;
                }
                await vscode.workspace.getConfiguration('oxygen').update(
                    'licenseKey',
                    key,
                    vscode.ConfigurationTarget.Global
                );
                const until = getLicenseExpiry(key);
                webviewView.webview.postMessage({
                    type: 'result',
                    ok: true,
                    message: `Activated until ${until ? until.toLocaleDateString() : 'expiry'}. Reloading...`,
                });
                setTimeout(() => {
                    void vscode.commands.executeCommand('workbench.action.reloadWindow');
                }, 600);
            });
        },
    };

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('oxygen.activationView', provider)
    );
}

module.exports = {
    openLicensePanel,
    registerLicenseSidebar,
};
