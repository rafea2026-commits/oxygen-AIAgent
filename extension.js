'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const { SessionTracker } = require('./src/core/session');
const { resolvePricing } = require('./src/core/pricing');
const { estimateTokens } = require('./src/core/tokens');
const { extractSkeletonWithMeta } = require('./src/skeleton');
const { computeScope, writeScopeArtifacts } = require('./src/geoFence');
const { syncBackbone } = require('./src/backbone');
const { processFile, ensureOxygenDir } = require('./src/oxygenCache');
const { createStatusBar } = require('./src/ui/statusBar');
const { detectHallucination } = require('./src/hallucination/detector');
const { SessionActivity, buildSessionSummary, writeSessionSummary } = require('./src/session/summary');

/** @type {SessionTracker | undefined} */
let session;
/** @type {SessionActivity | undefined} */
let sessionActivity;
/** @type {ReturnType<createStatusBar> | undefined} */
let statusBar;
/** @type {NodeJS.Timeout | undefined} */
let debounceTimer;
/** @type {NodeJS.Timeout | undefined} */
let summaryTimer;
/** @type {Map<string, number>} */
const lastHallucinationAlert = new Map();

function getConfig() {
    return vscode.workspace.getConfiguration('oxygen');
}

function getPricing() {
    return resolvePricing(getConfig());
}

function getWorkspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function activate(context) {
    session = new SessionTracker(getPricing());
    sessionActivity = new SessionActivity();

    statusBar = createStatusBar(vscode, session);
    statusBar.item.show();
    context.subscriptions.push(statusBar.item);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('oxygen.pricing') && session) {
                session.setPricing(getPricing());
                statusBar?.render();
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                onActiveFileChanged(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || event.document.uri.toString() !== editor.document.uri.toString()) {
                return;
            }
            scheduleRefresh(editor);
        })
    );

    const summaryIntervalMin = getConfig().get('session.summaryIntervalMinutes', 3);
    if (getConfig().get('session.autoSummary', true)) {
        summaryTimer = setInterval(() => flushSessionSummary(false), summaryIntervalMin * 60 * 1000);
        context.subscriptions.push({ dispose: () => clearInterval(summaryTimer) });
    }

    if (vscode.window.activeTextEditor) {
        onActiveFileChanged(vscode.window.activeTextEditor);
    }

    registerCommands(context);
    console.log('Oxygen AI Agent v0.2 — Phase 2 active');
}

function scheduleRefresh(editor) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => onActiveFileChanged(editor), 400);
}

async function onActiveFileChanged(editor) {
    if (!session || !statusBar || !sessionActivity) {
        return;
    }

    const config = getConfig();
    const pricing = getPricing();
    const uri = editor.document.uri.toString();
    const text = editor.document.getText();
    const fsPath = editor.document.uri.fsPath;
    const root = getWorkspaceRoot();

    session.recordFile(uri, text);
    statusBar.render();

    if (root && fsPath.startsWith(root)) {
        const rel = path.relative(root, fsPath).replace(/\\/g, '/');
        sessionActivity.touchFile(rel);
    }

    if (config.get('skeleton.autoCache', true) && root && fsPath.startsWith(root)) {
        try {
            processFile(root, fsPath, text, pricing);
        } catch {
            // ignore cache errors
        }
    }

    if (config.get('geoFence.autoApply', true)) {
        await applyGeoFence(false);
    }

    if (config.get('backbone.autoSync', true)) {
        await syncBackboneQuiet(fsPath);
    }

    if (config.get('hallucination.enabled', true)) {
        runHallucinationRadar(text, fsPath, root);
    } else if (config.get('flopStop.enabled', true)) {
        checkFlopStop(text);
    }

    if (config.get('session.autoSummary', true)) {
        scheduleSummaryFlush();
    }
}

function runHallucinationRadar(text, filePath, workspaceRoot) {
    const config = getConfig();
    const result = detectHallucination(text, filePath, workspaceRoot);

    if (sessionActivity && result.level !== 'ok') {
        sessionActivity.recordHallucination(result, filePath ? path.basename(filePath) : undefined);
    }

    const warnAt = config.get('hallucination.warningThreshold', 30);
    const criticalAt = config.get('hallucination.criticalThreshold', 55);

    if (result.score < warnAt) {
        return;
    }

    const alertKey = `${filePath}:${result.level}`;
    const prev = lastHallucinationAlert.get(alertKey) ?? 0;
    if (result.score < prev + 8 && prev >= warnAt) {
        return;
    }
    lastHallucinationAlert.set(alertKey, result.score);

    const topFinding = result.findings[0] ?? 'إشارات هلوسة/تكرار';
    const actions = result.score >= criticalAt
        ? ['Agent Compass', 'تطهير السياق']
        : ['Agent Compass'];

    const fn = result.score >= criticalAt ? 'showErrorMessage' : 'showWarningMessage';
    vscode.window[fn](
        `Oxygen Radar [${result.score}/100]: ${topFinding}`,
        ...actions
    ).then((choice) => {
        if (choice === 'Agent Compass') {
            vscode.commands.executeCommand('oxygen.agentCompass');
        } else if (choice === 'تطهير السياق') {
            vscode.commands.executeCommand('oxygen.purifyContext');
        }
    });

    if (config.get('flopStop.enabled', true)) {
        checkFlopStop(text, true);
    }
}

function checkFlopStop(text, skipDuplicateAlert = false) {
    const config = getConfig();
    const maxTokens = config.get('flopStop.maxResponseTokens', 4000);
    const estimated = estimateTokens(text);

    if (!skipDuplicateAlert) {
        const lines = text.split(/\r?\n/);
        const seen = new Map();
        let repeats = 0;
        for (const line of lines) {
            const key = line.trim();
            if (key.length < 20) {
                continue;
            }
            const count = (seen.get(key) ?? 0) + 1;
            seen.set(key, count);
            if (count >= 3) {
                repeats++;
            }
        }
        if (repeats >= 2) {
            vscode.window.showWarningMessage(
                `Oxygen Flop-Stop: ${repeats} أسطر مكررة — قلّل السياق.`,
                'نسخ Skeleton'
            ).then((c) => c === 'نسخ Skeleton' && vscode.commands.executeCommand('oxygen.copySkeleton'));
        }
    }

    if (estimated > maxTokens * 5) {
        vscode.window.showInformationMessage(
            `Oxygen: ~${estimated} توكن في هذا الملف — استخدم Skeleton.`,
            'نسخ Skeleton'
        ).then((c) => c === 'نسخ Skeleton' && vscode.commands.executeCommand('oxygen.copySkeleton'));
    }
}

let summaryFlushTimer;
function scheduleSummaryFlush() {
    if (summaryFlushTimer) {
        clearTimeout(summaryFlushTimer);
    }
    summaryFlushTimer = setTimeout(() => flushSessionSummary(false), 8000);
}

function flushSessionSummary(showMessage) {
    const root = getWorkspaceRoot();
    if (!root || !session || !sessionActivity) {
        return undefined;
    }

    const active = vscode.window.activeTextEditor?.document.uri.fsPath;
    const relActive = active ? path.relative(root, active).replace(/\\/g, '/') : undefined;
    const markdown = buildSessionSummary({
        activity: sessionActivity,
        session,
        pricing: getPricing(),
        activeFile: relActive,
    });
    const mdPath = writeSessionSummary(root, markdown, sessionActivity, session.getTotalSavedUSD());

    if (showMessage) {
        vscode.window.showInformationMessage(`Oxygen: session summary → ${path.relative(root, mdPath)}`);
    }
    return mdPath;
}

async function syncBackboneQuiet(activeFilePath) {
    const root = getWorkspaceRoot();
    if (!root) {
        return;
    }
    try {
        syncBackbone(root, activeFilePath);
    } catch {
        // ignore
    }
}

async function applyGeoFence(showMessage) {
    const root = getWorkspaceRoot();
    const editor = vscode.window.activeTextEditor;
    if (!root || !editor) {
        if (showMessage) {
            vscode.window.showWarningMessage('Oxygen: افتح workspace وملفاً نشطاً.');
        }
        return;
    }

    const depth = getConfig().get('geoFence.scopeDepth', 2);
    const scope = computeScope(editor.document.uri.fsPath, root, depth);
    const { payload } = writeScopeArtifacts(root, scope);
    sessionActivity?.setScope(payload.scopeLabel);

    if (showMessage) {
        vscode.window.showInformationMessage(
            `Oxygen Geo-Fence: "${payload.scopeLabel}" — ${payload.blockedGlobs.length} blocked.`
        );
    }
}

function registerCommands(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.copySkeleton', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Oxygen: no open file.');
                return;
            }
            const meta = extractSkeletonWithMeta(editor.document.getText(), editor.document.uri.fsPath);
            await vscode.env.clipboard.writeText(meta.skeleton);
            vscode.window.showInformationMessage(
                `Skeleton copied (~${Math.round((1 - meta.compressionRatio) * 100)}% smaller, ${meta.languageGroup}).`
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.generateSkeleton', async () => {
            const editor = vscode.window.activeTextEditor;
            const root = getWorkspaceRoot();
            if (!editor || !root) {
                return;
            }
            const result = processFile(root, editor.document.uri.fsPath, editor.document.getText(), getPricing());
            session?.addExplicitSavings(result.savings.savedDollar);
            statusBar?.render();
            vscode.window.showInformationMessage(`Skeleton cached: ${path.relative(root, result.cachePath)}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.applyGeoFence', () => applyGeoFence(true))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.syncBackbone', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                return;
            }
            const { backbonePath } = syncBackbone(root, vscode.window.activeTextEditor?.document.uri.fsPath);
            vscode.window.showInformationMessage(`Backbone synced: ${path.relative(root, backbonePath)}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.purifyContext', async () => {
            if (!session || !statusBar) {
                return;
            }
            const bonus = session.addPurifyBonus(getConfig().get('purify.bonusTokens', 5000));
            statusBar.render();
            const root = getWorkspaceRoot();
            if (root) {
                ensureOxygenDir(root);
                const summary = buildPurifySummary(root);
                fs.writeFileSync(path.join(root, '.oxygen', 'session-purify-summary.md'), summary, 'utf8');
                await vscode.env.clipboard.writeText(summary);
            }
            flushSessionSummary(false);
            vscode.window.showInformationMessage(`Purified (+$${bonus.toFixed(4)}). Clean prompt copied.`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.copySessionSummary', async () => {
            const mdPath = flushSessionSummary(true);
            if (mdPath) {
                const content = fs.readFileSync(mdPath, 'utf8');
                await vscode.env.clipboard.writeText(content);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.agentCompass', () => {
            OxygenCompassPanel.createOrShow(context.extensionUri, getWorkspaceRoot(), sessionActivity);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.showDashboard', () => {
            if (!session) {
                return;
            }
            const p = getPricing();
            const alerts = sessionActivity?.hallucinationEvents.length ?? 0;
            vscode.window.showInformationMessage(
                `Oxygen: $${session.getTotalSavedUSD().toFixed(4)} saved · ${p.label} · ${alerts} radar alerts`
            );
        })
    );
}

function buildPurifySummary(root) {
    const autoPath = path.join(root, '.oxygen', 'session-summary.md');
    if (fs.existsSync(autoPath)) {
        return fs.readFileSync(autoPath, 'utf8');
    }
    return flushSessionSummary(false)
        ? fs.readFileSync(path.join(root, '.oxygen', 'session-summary.md'), 'utf8')
        : '# Oxygen Purify\n\n> Describe your next single task here.\n';
}

class OxygenCompassPanel {
    static currentPanel;

    static createOrShow(extensionUri, workspaceRoot, activity) {
        const column = vscode.window.activeTextEditor?.viewColumn;
        if (OxygenCompassPanel.currentPanel) {
            OxygenCompassPanel.currentPanel.refresh(activity);
            OxygenCompassPanel.currentPanel.panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'oxygenCompass',
            'Oxygen — Agent Compass',
            column || vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        OxygenCompassPanel.currentPanel = new OxygenCompassPanel(panel, workspaceRoot, activity);
    }

    constructor(panel, workspaceRoot, activity) {
        this.panel = panel;
        this.workspaceRoot = workspaceRoot;
        this.activity = activity;
        this.render();

        this.panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'inject') {
                const alerts = this.activity?.hallucinationEvents.slice(-3) ?? [];
                const alertText = alerts.length
                    ? alerts.map((a) => `- [${a.level}] ${a.findings[0] ?? 'signal'}`).join('\n')
                    : '- No recent alerts';

                const correction = [
                    '# Oxygen Correction Injection',
                    '',
                    'Reset focus now:',
                    '- One small step only.',
                    '- No hallucinated paths or APIs.',
                    '- Read .oxygen/.agent_backbone.yaml and session-summary.md first.',
                    '',
                    'Recent radar:',
                    alertText,
                    '',
                    `Developer note: ${msg.note || '(none)'}`,
                ].join('\n');

                await vscode.env.clipboard.writeText(correction);
                vscode.window.showInformationMessage('Correction prompt copied.');
            }
            if (msg.command === 'purify') {
                vscode.commands.executeCommand('oxygen.purifyContext');
            }
            if (msg.command === 'summary') {
                vscode.commands.executeCommand('oxygen.copySessionSummary');
            }
        });

        this.panel.onDidDispose(() => {
            OxygenCompassPanel.currentPanel = undefined;
        });
    }

    refresh(activity) {
        this.activity = activity;
        this.render();
    }

    render() {
        const alerts = this.activity?.hallucinationEvents.slice(-5).reverse() ?? [];
        const alertHtml = alerts.length
            ? alerts.map((a) => `<li><strong>${a.level}</strong> (${a.score}) ${a.file ?? ''}<br/><small>${(a.findings[0] ?? '').replace(/</g, '&lt;')}</small></li>`).join('')
            : '<li>لا تنبيهات بعد — الوضع هادئ ✓</li>';

        this.panel.webview.html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: sans-serif; padding: 16px; color: #ccc; background: #1e1e1e; }
    h2 { color: #4ec9b0; }
    textarea { width: 100%; height: 72px; background: #252526; color: #ddd; border: 1px solid #444; padding: 8px; box-sizing: border-box; }
    button { margin: 6px 0 6px 6px; padding: 8px 12px; cursor: pointer; border: none; }
    .primary { background: #0e639c; color: white; }
    .warn { background: #5a2d2d; color: white; }
    .ghost { background: #333; color: #ddd; }
    ul { padding-right: 18px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h2>🧭 Agent Compass</h2>
  <p>رادار الهلوسة + حقن تصحيحي + ملخص الجلسة.</p>
  <h3>آخر التنبيهات</h3>
  <ul>${alertHtml}</ul>
  <label>ملاحظة:</label>
  <textarea id="note" placeholder="مثال: توقف عن invent paths"></textarea>
  <div>
    <button class="primary" onclick="inject()">💉 حقن مصل</button>
    <button class="warn" onclick="purify()">🫧 تطهير</button>
    <button class="ghost" onclick="summary()">📋 ملخص الجلسة</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function inject() { vscode.postMessage({ command: 'inject', note: document.getElementById('note').value }); }
    function purify() { vscode.postMessage({ command: 'purify' }); }
    function summary() { vscode.postMessage({ command: 'summary' }); }
  </script>
</body>
</html>`;
    }
}

function deactivate() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    if (summaryFlushTimer) {
        clearTimeout(summaryFlushTimer);
    }
    if (summaryTimer) {
        clearInterval(summaryTimer);
    }
    flushSessionSummary(false);
}

module.exports = { activate, deactivate };
