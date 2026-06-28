'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const { SessionTracker } = require('./src/core/session');
const { resolvePricing } = require('./src/core/pricing');
const { estimateTokens } = require('./src/core/tokens');
const { extractSkeletonWithMeta } = require('./src/skeleton');
const { computeScope, writeScopeArtifacts } = require('./src/scope');
const { processFile } = require('./src/oxygenCache');
const { createStatusBar } = require('./src/ui/statusBar');
const { SessionActivity, buildSessionSummary, writeSessionSummary } = require('./src/session/summary');
const { writeProjectMap, entryFromProcessResult } = require('./src/context/projectMap');
const { detectFramework, writeFrameworkInfo } = require('./src/context/framework');
const { indexWorkspace, buildContextBundle, minifySelection, isSourceFile } = require('./src/context/bundle');
const { WATCH_FILE_GLOB, WATCH_NAMED_GLOBS } = require('./src/context/frameworkFiles');

/** @type {SessionTracker | undefined} */
let session;
/** @type {SessionActivity | undefined} */
let sessionActivity;
/** @type {ReturnType<createStatusBar> | undefined} */
let statusBar;
/** @type {import('vscode').OutputChannel | undefined} */
let logChannel;
/** @type {NodeJS.Timeout | undefined} */
let debounceTimer;
/** @type {NodeJS.Timeout | undefined} */
let summaryTimer;
/** @type {NodeJS.Timeout | undefined} */
let summaryFlushTimer;
/** @type {Map<string, NodeJS.Timeout>} */
const fileWatchTimers = new Map();

function log(msg) {
    const line = `[Oxygen] ${msg}`;
    logChannel?.appendLine(line);
    console.log(line);
}

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
    logChannel = vscode.window.createOutputChannel('Oxygen');
    context.subscriptions.push(logChannel);
    log('Token Saver v1.0.3 — activating');

    session = new SessionTracker(getPricing());
    sessionActivity = new SessionActivity();

    statusBar = createStatusBar(vscode, session);
    if (getConfig().get('ui.showStatusBar', true)) {
        statusBar.item.show();
    }
    context.subscriptions.push(statusBar.item);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('oxygen.ui.showStatusBar') && statusBar) {
                if (getConfig().get('ui.showStatusBar', true)) {
                    statusBar.item.show();
                } else {
                    statusBar.item.hide();
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('oxygen.pricing') && session) {
                session.setPricing(getPricing());
                refreshStatusBar();
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                scheduleRefresh(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document.uri.toString() === editor.document.uri.toString()) {
                scheduleRefresh(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (doc.uri.scheme === 'file') {
                void handleFile(doc.uri.fsPath, doc.getText());
            }
        })
    );

    const summaryMin = getConfig().get('session.summaryIntervalMinutes', 3);
    if (getConfig().get('session.autoSummary', true)) {
        summaryTimer = setInterval(() => flushSessionSummary(), summaryMin * 60 * 1000);
        context.subscriptions.push({ dispose: () => clearInterval(summaryTimer) });
    }

    registerCommands(context);
    setupFileWatcher(context);

    setImmediate(() => {
        const root = getWorkspaceRoot();
        if (root && getConfig().get('tokens.autoIndexOnOpen', true)) {
            statusBar?.renderIndexing();
            void runWorkspaceIndex(false);
        } else if (vscode.window.activeTextEditor) {
            void handleEditor(vscode.window.activeTextEditor);
        } else {
            refreshStatusBar(undefined);
            statusBar?.item.show();
        }
    });

    log('ready');
}

function scheduleRefresh(editor) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => void handleEditor(editor), 350);
}

function refreshStatusBar(editor) {
    const text = editor?.document.getText() ?? '';
    const tokens = text ? estimateTokens(text) : 0;
    const largeAt = getConfig().get('tokens.largeFileWarning', 4000);
    statusBar?.render(tokens, tokens > largeAt);
}

async function handleEditor(editor) {
    if (!session || !sessionActivity) {
        return;
    }

    const config = getConfig();
    const pricing = getPricing();
    const uri = editor.document.uri.toString();
    const text = editor.document.getText();
    const fsPath = editor.document.uri.fsPath;
    const root = getWorkspaceRoot();

    refreshStatusBar(editor);

    if (root && fsPath.startsWith(root)) {
        sessionActivity.touchFile(path.relative(root, fsPath).replace(/\\/g, '/'));
    }

    if (config.get('skeleton.autoCache', true) && root && fsPath.startsWith(root)) {
        try {
            const result = processFile(root, fsPath, text, pricing);
            session.recordSkeleton(uri, text, result.skeleton);
            refreshStatusBar(editor);
        } catch (err) {
            log(`cache skip: ${err instanceof Error ? err.message : err}`);
        }
    }

    if (config.get('scope.autoApply', true) && root) {
        applyScope(root, fsPath);
    }

    if (config.get('session.autoSummary', true)) {
        scheduleSummaryFlush();
    }
}

async function processFileOnDisk(fsPath) {
    const root = getWorkspaceRoot();
    if (!root || !session || !fsPath.startsWith(root) || !isSourceFile(fsPath)) {
        return;
    }

    const config = getConfig();
    if (!config.get('skeleton.autoCache', true)) {
        return;
    }

    try {
        const text = fs.readFileSync(fsPath, 'utf8');
        if (text.length < 40) {
            return;
        }
        const pricing = getPricing();
        const result = processFile(root, fsPath, text, pricing);
        session.recordSkeleton(vscode.Uri.file(fsPath).toString(), text, result.skeleton);
        refreshStatusBar(vscode.window.activeTextEditor);
        if (config.get('session.autoSummary', true)) {
            scheduleSummaryFlush();
        }
    } catch (err) {
        log(`disk scan skip: ${err instanceof Error ? err.message : err}`);
    }
}

function scheduleDiskProcess(fsPath) {
    const existing = fileWatchTimers.get(fsPath);
    if (existing) {
        clearTimeout(existing);
    }
    fileWatchTimers.set(fsPath, setTimeout(() => {
        fileWatchTimers.delete(fsPath);
        void processFileOnDisk(fsPath);
    }, 600));
}

function setupFileWatcher(context) {
    if (!getConfig().get('tokens.watchFiles', true)) {
        return;
    }

    const onDiskChange = (uri) => {
        if (uri.scheme !== 'file') {
            return;
        }
        scheduleDiskProcess(uri.fsPath);
    };

    const watcher = vscode.workspace.createFileSystemWatcher(WATCH_FILE_GLOB);
    watcher.onDidChange(onDiskChange);
    watcher.onDidCreate(onDiskChange);
    context.subscriptions.push(watcher);

    for (const pattern of WATCH_NAMED_GLOBS) {
        const namedWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        namedWatcher.onDidChange(onDiskChange);
        namedWatcher.onDidCreate(onDiskChange);
        context.subscriptions.push(namedWatcher);
    }

    context.subscriptions.push({
        dispose: () => {
            for (const timer of fileWatchTimers.values()) {
                clearTimeout(timer);
            }
            fileWatchTimers.clear();
        },
    });
}

async function handleFile(fsPath, text) {
    const root = getWorkspaceRoot();
    if (!root || !fsPath.startsWith(root) || !session) {
        return;
    }
    const pricing = getPricing();
    const uri = vscode.Uri.file(fsPath).toString();
    try {
        const result = processFile(root, fsPath, text, pricing);
        session.recordSkeleton(uri, text, result.skeleton);
    } catch {
        // ignore
    }
}

function applyScope(root, fsPath) {
    const depth = getConfig().get('scope.depth', 2);
    const scope = computeScope(fsPath, root, depth);
    const { payload } = writeScopeArtifacts(root, scope);
    sessionActivity?.setScope(payload.scopeLabel);
}

function scheduleSummaryFlush() {
    if (summaryFlushTimer) {
        clearTimeout(summaryFlushTimer);
    }
    summaryFlushTimer = setTimeout(() => flushSessionSummary(), 8000);
}

function flushSessionSummary() {
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

    return writeSessionSummary(
        root,
        markdown,
        sessionActivity,
        session.getTotalSavedUSD(),
        session.getTotalSavedTokens()
    );
}

async function runWorkspaceIndex(showMessage) {
    const root = getWorkspaceRoot();
    if (!root || !session) {
        return;
    }

    const pricing = getPricing();
    const trackSession = getConfig().get('skeleton.autoCache', true);
    /** @type {object[]} */
    const entries = [];

    statusBar?.renderIndexing();

    const framework = detectFramework(root);
    writeFrameworkInfo(root, framework);

    await indexWorkspace(vscode, root, (fsPath, text) => {
        const result = processFile(root, fsPath, text, pricing);
        const entry = entryFromProcessResult(result);
        entries.push(entry);
        if (trackSession) {
            session.recordSkeleton(vscode.Uri.file(fsPath).toString(), text, result.skeleton);
        }
        return entry;
    });

    const { savedTokens, savedPercent } = writeProjectMap(root, entries, framework);
    sessionActivity?.setIndexed(entries.length);
    sessionActivity?.setFramework(framework.label);
    log(`framework: ${framework.label} — indexed ${entries.length} files — ${savedPercent}% compressible (${savedTokens.toLocaleString()} tok)`);

    if (showMessage) {
        void vscode.window.showInformationMessage(
            `Oxygen: indexed ${entries.length} files — ${savedPercent}% token savings (~${savedTokens.toLocaleString()} tok)`
        );
    }

    flushSessionSummary();
    refreshStatusBar(vscode.window.activeTextEditor);
}

function registerCommands(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.showLog', () => logChannel?.show(true))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.copySkeleton', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const text = editor.document.getText();
            const meta = extractSkeletonWithMeta(text, editor.document.uri.fsPath);
            await vscode.env.clipboard.writeText(meta.skeleton);
            const saved = estimateTokens(text) - estimateTokens(meta.skeleton);
            void vscode.window.showInformationMessage(`Skeleton copied — saves ~${Math.max(0, saved)} tokens`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.copyContextBundle', async () => {
            const editor = vscode.window.activeTextEditor;
            const root = getWorkspaceRoot();
            if (!editor || !root || !session) {
                return;
            }

            const text = editor.document.getText();
            const meta = extractSkeletonWithMeta(text, editor.document.uri.fsPath);
            const rel = path.relative(root, editor.document.uri.fsPath).replace(/\\/g, '/');

            let mapExcerpt = '';
            const mapPath = path.join(root, '.oxygen', 'project-map.md');
            if (fs.existsSync(mapPath)) {
                mapExcerpt = fs.readFileSync(mapPath, 'utf8').split('\n').slice(0, 25).join('\n');
            }

            const bundle = buildContextBundle({
                activeFile: rel,
                activeSkeleton: meta.skeleton,
                activeOriginalTokens: estimateTokens(text),
                scopeLabel: sessionActivity?.lastScopeLabel,
                frameworkLabel: sessionActivity?.frameworkLabel,
                sessionSavedUSD: session.getTotalSavedUSD(),
                sessionSavedTokens: session.getTotalSavedTokens(),
                pricingLabel: session.getPricingLabel(),
                projectMapExcerpt: mapExcerpt,
            });

            await vscode.env.clipboard.writeText(bundle);
            void vscode.window.showInformationMessage('Context bundle copied — paste into Agent chat');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.purifySelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.selection.isEmpty || !session) {
                void vscode.window.showWarningMessage('Select code first');
                return;
            }
            const raw = editor.document.getText(editor.selection);
            const clean = minifySelection(raw);
            await vscode.env.clipboard.writeText(clean);
            const result = session.recordMinify(editor.document.uri.toString(), raw, clean);
            refreshStatusBar(editor);
            void vscode.window.showInformationMessage(`Minified selection — saves ~${Math.max(0, result.savedTokens)} tokens`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.indexWorkspace', () => runWorkspaceIndex(true))
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.generateSkeleton', async () => {
            const editor = vscode.window.activeTextEditor;
            const root = getWorkspaceRoot();
            if (!editor || !root || !session) {
                return;
            }
            const text = editor.document.getText();
            const result = processFile(root, editor.document.uri.fsPath, text, getPricing());
            session.recordSkeleton(editor.document.uri.toString(), text, result.skeleton);
            refreshStatusBar(editor);
            void vscode.window.showInformationMessage(`Cached skeleton — saves ~${result.savings.savedTokens} tokens`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.applyScope', () => {
            const editor = vscode.window.activeTextEditor;
            const root = getWorkspaceRoot();
            if (!editor || !root) {
                return;
            }
            applyScope(root, editor.document.uri.fsPath);
            void vscode.window.showInformationMessage('Scope saved — .oxygen/context-scope.json');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.copySessionSummary', async () => {
            const mdPath = flushSessionSummary();
            if (mdPath) {
                await vscode.env.clipboard.writeText(fs.readFileSync(mdPath, 'utf8'));
                void vscode.window.showInformationMessage('Session summary copied');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oxygen.resetSession', () => {
            if (!session || !sessionActivity) {
                return;
            }
            session.reset();
            sessionActivity.reset();
            flushSessionSummary();
            refreshStatusBar(vscode.window.activeTextEditor);
            log('session counter reset — re-indexing workspace');
            statusBar?.renderIndexing();
            void runWorkspaceIndex(false);
            void vscode.window.showInformationMessage('Oxygen: counter reset — re-indexing workspace...');
        })
    );
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
    for (const timer of fileWatchTimers.values()) {
        clearTimeout(timer);
    }
    fileWatchTimers.clear();
    flushSessionSummary();
}

module.exports = { activate, deactivate };
