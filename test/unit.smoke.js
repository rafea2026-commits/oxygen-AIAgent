'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { estimateTokens, calculateSavings, minifyText } = require('../src/core/tokens');
const { resolvePricing, PRICING_PRESETS } = require('../src/core/pricing');
const { extractSkeletonWithMeta } = require('../src/skeleton');
const { SessionTracker } = require('../src/core/session');
const { SessionActivity, buildSessionSummary } = require('../src/session/summary');
const { processFile } = require('../src/oxygenCache');
const { writeProjectMap } = require('../src/context/projectMap');
const { buildContextBundle, minifySelection } = require('../src/context/bundle');
const { computeScope } = require('../src/scope');

/**
 * Minimal WorkspaceConfiguration stub for unit tests.
 * @param {Record<string, unknown>} values
 * @returns {import('vscode').WorkspaceConfiguration}
 */
function mockConfig(values) {
    return {
        /** @template T @param {string} key @param {T} [defaultValue] @returns {T} */
        get: (key, defaultValue) => {
            if (key in values) {
                return /** @type {T} */ (values[key]);
            }
            return /** @type {T} */ (defaultValue);
        },
        has: (key) => key in values,
        inspect: () => undefined,
        update: async () => undefined,
    };
}

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        throw err;
    }
}

console.log('Oxygen Token Saver tests\n');

test('estimateTokens', () => {
    assert.strictEqual(estimateTokens(''), 0);
    assert.strictEqual(estimateTokens('abcd'), 1);
});

test('pricing preset composer', () => {
    const p = resolvePricing(mockConfig({}));
    assert.strictEqual(p.preset, 'composer');
});

test('skeleton compresses JS', () => {
    const src = `import fs from 'fs';\n\nexport function greet(name) {\n  console.log(name);\n  return name;\n}\n\nexport class User {\n  constructor(id) { this.id = id; }\n  save() { return fs.writeFileSync('x', 'y'); }\n}`;
    const meta = extractSkeletonWithMeta(src, 'a.ts');
    assert.ok(meta.skeleton.includes('greet'));
    assert.ok(meta.skeleton.length < src.length);
});

test('Dart skeleton', () => {
    const src = `import 'package:flutter/material.dart';\n\nclass MyApp extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) => MaterialApp(home: Text('Hi'));\n}\n\nvoid main() => runApp(MyApp());\n`;
    const meta = extractSkeletonWithMeta(src, 'lib/main.dart');
    assert.ok(meta.skeleton.includes('class MyApp'));
    assert.ok(meta.skeleton.includes('void main'));
});

test('Dart skeleton skips method bodies', () => {
    const src = [
        "import 'package:flutter/material.dart';",
        'class HomeScreen extends StatefulWidget {',
        '  const HomeScreen({super.key});',
        '  @override',
        '  State<HomeScreen> createState() => _HomeScreenState();',
        '}',
        'class _HomeScreenState extends State<HomeScreen> {',
        '  @override',
        '  void initState() { super.initState(); _load(); }',
        '  Future<void> _load() async { await Future.delayed(Duration.zero); }',
        '  @override',
        '  Widget build(BuildContext context) {',
        '    final theme = Theme.of(context);',
        '    return Scaffold(body: Text(theme.primaryColor.toString()));',
        '  }',
        '}',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'lib/home_screen.dart');
    assert.ok(!meta.skeleton.includes('return Scaffold'), 'must not leak build body');
    assert.ok(!meta.skeleton.includes('final theme = Theme'), 'must not leak local vars');
    assert.ok(meta.skeleton.includes('class HomeScreen extends StatefulWidget { /* ... */ }'));
    assert.ok(meta.skeleton.includes('class _HomeScreenState extends State<HomeScreen> { /* ... */ }'));
    assert.ok(meta.skeleton.length < src.length * 0.5, 'skeleton should compress at least 50%');
});

test('Kotlin skeleton', () => {
    const src = [
        'package com.example.app',
        '',
        'import androidx.compose.runtime.Composable',
        '',
        'class MainActivity {',
        '    fun onCreate() { println("hello") }',
        '}',
        '',
        'fun main() { println("start") }',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'app/src/MainActivity.kt');
    assert.ok(meta.skeleton.includes('package com.example.app'));
    assert.ok(meta.skeleton.includes('class MainActivity { /* ... */ }'));
    assert.ok(meta.skeleton.includes('fun main() { /* ... */ }'));
});

test('Kotlin skeleton skips composable bodies', () => {
    const src = [
        'package com.example.ui',
        '',
        'import androidx.compose.material3.Text',
        'import androidx.compose.runtime.Composable',
        '',
        '@Composable',
        'fun GreetingScreen(name: String) {',
        '    Text(text = "Hello $name")',
        '    Column {',
        '        Text(text = "Nested")',
        '    }',
        '}',
        '',
        'class HomeViewModel {',
        '    suspend fun loadItems(): List<String> {',
        '        return listOf("a", "b", "c")',
        '    }',
        '}',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'app/src/HomeScreen.kt');
    assert.ok(!meta.skeleton.includes('Hello $name'), 'must not leak composable body');
    assert.ok(!meta.skeleton.includes('listOf('), 'must not leak function body');
    assert.ok(meta.skeleton.includes('fun GreetingScreen(name: String) { /* ... */ }'));
    assert.ok(meta.skeleton.includes('class HomeViewModel { /* ... */ }'));
});

test('session tracks skeleton savings', () => {
    const pricing = resolvePricing(mockConfig({}));
    const session = new SessionTracker(pricing);
    const raw = 'function hello() {\n  console.log("x");\n  return 1;\n}\n'.repeat(10);
    const skel = 'function hello() { ... }\n';
    const r = session.recordSkeleton('file:///a.js', raw, skel);
    assert.ok(r.savedTokens > 0);
    assert.ok(session.getTotalSavedTokens() > 0);
});

test('processFile caches skeleton', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oxygen-'));
    const file = path.join(tmp, 'lib', 'a.dart');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const src = [
        "import 'package:flutter/material.dart';",
        'class A {',
        ...Array.from({ length: 20 }, (_, i) => `  void m${i}() { print('line ${i} with more text'); }`),
        '}',
        '',
    ].join('\n');
    fs.writeFileSync(file, src);
    const pricing = resolvePricing(mockConfig({}));
    const result = processFile(tmp, file, src, pricing);
    assert.ok(fs.existsSync(result.cachePath));
    assert.ok(result.rel === 'lib/a.dart');
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('project map writes index', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oxygen-'));
    const entries = [
        { rel: 'lib/a.dart', originalTokens: 1000, skeletonTokens: 150, compressionRatio: 0.15, languageGroup: 'dart' },
    ];
    const { savedPercent } = writeProjectMap(tmp, entries);
    assert.ok(savedPercent >= 80);
    assert.ok(fs.existsSync(path.join(tmp, '.oxygen', 'project-map.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oxygen', 'token-index.json')));
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('context bundle includes skeleton', () => {
    const bundle = buildContextBundle({
        activeFile: 'lib/main.dart',
        activeSkeleton: 'class Main { ... }',
        activeOriginalTokens: 500,
        sessionSavedTokens: 1200,
        sessionSavedUSD: 0.0015,
        pricingLabel: 'Composer',
        scopeLabel: 'lib',
    });
    assert.ok(bundle.includes('class Main'));
    assert.ok(bundle.includes('Token Saver'));
    assert.ok(bundle.includes('Session saved'));
});

test('minify selection removes comments', () => {
    const raw = 'const x = 1;\n// comment\nconst y = 2;';
    const clean = minifySelection(raw);
    assert.ok(!clean.includes('comment'));
});

test('scope computes allowed globs', () => {
    const root = path.join('C:', 'project');
    const file = path.join(root, 'lib', 'features', 'auth', 'login.dart');
    const scope = computeScope(file, root, 2);
    assert.ok(scope.allowedGlobs.some((g) => g.includes('auth') || g.includes('lib')));
});

test('session summary is token-focused', () => {
    const activity = new SessionActivity();
    activity.touchFile('lib/main.dart');
    activity.setScope('lib');
    activity.setIndexed(42);
    const session = new SessionTracker(resolvePricing(mockConfig({})));
    session.recordSkeleton('u', 'x'.repeat(400), 'x');
    const md = buildSessionSummary({
        activity,
        session,
        pricing: resolvePricing(mockConfig({})),
        activeFile: 'lib/main.dart',
    });
    assert.ok(md.includes('Token Session Summary'));
    assert.ok(md.includes('lib/main.dart'));
    assert.ok(!md.includes('Hallucination'));
});

console.log(`\n${passed} passed`);
