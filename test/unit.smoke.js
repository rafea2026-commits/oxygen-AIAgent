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
    const code = 'export function foo(a, b) { return a + b; }';
    const simple = estimateTokens('abcd');
    const codeTokens = estimateTokens(code);
    assert.ok(codeTokens > simple, 'code should estimate more tokens than 4 chars');
    assert.ok(codeTokens < code.length, 'estimate should be less than char count');
});

test('pricing preset composer', () => {
    const p = resolvePricing(mockConfig({}));
    assert.strictEqual(p.preset, 'composer');
});

test('skeleton compresses JS', () => {
    const src = `import fs from 'fs';\n\nexport function greet(name) {\n  console.log(name);\n  return name;\n}\n\nexport class User {\n  constructor(id) { this.id = id; }\n  save() { return fs.writeFileSync('x', 'y'); }\n}`;
    const meta = extractSkeletonWithMeta(src, 'src/utils.js');
    assert.strictEqual(meta.languageGroup, 'javascript');
    assert.ok(meta.skeleton.includes('greet'));
    assert.ok(meta.skeleton.length < src.length);
});

test('JavaScript skeleton skips function bodies', () => {
    const src = [
        "import express from 'express';",
        'export async function fetchUser(id) {',
        '  const res = await fetch(`/api/users/${id}`);',
        '  return res.json();',
        '}',
        'export class UserService {',
        '  constructor(db) { this.db = db; }',
        '  save(user) { return this.db.insert(user); }',
        '}',
        'const bootstrap = () => { console.log("ready"); };',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'src/server.js');
    assert.strictEqual(meta.languageGroup, 'javascript');
    assert.ok(meta.skeleton.includes('export async function fetchUser(id) { /* ... */ }'));
    assert.ok(meta.skeleton.includes('export class UserService { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('fetch(`/api/users'));
    assert.ok(!meta.skeleton.includes('console.log("ready")'));
});

test('C++ skeleton skips function bodies', () => {
    const src = [
        '#include <iostream>',
        '#include <vector>',
        'namespace app {',
        'class UserRepo {',
        'public:',
        '    std::vector<std::string> loadAll() {',
        '        return {"alice", "bob", "secret"};',
        '    }',
        '};',
        'void run() { std::cout << "hidden"; }',
        '}',
        'int main() { run(); return 0; }',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'src/main.cpp');
    assert.strictEqual(meta.languageGroup, 'cpp');
    assert.ok(meta.skeleton.includes('#include <iostream>'));
    assert.ok(meta.skeleton.includes('namespace app { /* ... */ }'));
    assert.ok(meta.skeleton.includes('int main() { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('"secret"'));
    assert.ok(!meta.skeleton.includes('std::cout'));
});

test('HTML skeleton keeps structure not inline scripts', () => {
    const src = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <title>Dashboard</title>',
        '  <link rel="stylesheet" href="/app.css">',
        '  <script src="/vendor.js"></script>',
        '</head>',
        '<body>',
        '  <main id="app" class="container primary">',
        '    <section class="hero">Hello</section>',
        '    <script>',
        '      const secret = "do-not-leak";',
        '      initApp(secret);',
        '    </script>',
        '  </main>',
        '</body>',
        '</html>',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'public/index.html');
    assert.strictEqual(meta.languageGroup, 'html');
    assert.ok(meta.skeleton.includes('<title>Dashboard</title>'));
    assert.ok(meta.skeleton.includes('<link rel="stylesheet" href="/app.css" />'));
    assert.ok(meta.skeleton.includes('<script src="/vendor.js"></script>'));
    assert.ok(meta.skeleton.includes('id="app"'));
    assert.ok(!meta.skeleton.includes('do-not-leak'));
    assert.ok(!meta.skeleton.includes('initApp(secret)'));
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

test('Kotlin skeleton collapses data class and import blocks', () => {
    const src = [
        'package com.example',
        'import a.A',
        'import b.B',
        'import c.C',
        'import d.D',
        'import e.E',
        'import f.F',
        'data class User(val id: String, val email: String, val name: String)',
        '@Composable',
        'fun Screen() { Text("hi") }',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'app/Main.kt');
    assert.ok(meta.skeleton.includes('import ... (6 imports)'), 'long import block collapsed');
    assert.ok(meta.skeleton.includes('data class User(/* 3 props */)'));
    assert.ok(!meta.skeleton.includes('Text("hi")'));
});

test('Java skeleton skips method bodies', () => {
    const src = [
        'package com.example;',
        'import java.util.List;',
        'public class UserRepo {',
        '    public List<String> loadAll() {',
        '        return List.of("a", "b", "c");',
        '    }',
        '}',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'app/src/UserRepo.java');
    assert.ok(meta.skeleton.includes('public class UserRepo { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('List.of('));
});

test('Swift skeleton skips view bodies', () => {
    const src = [
        'import SwiftUI',
        'struct ContentView: View {',
        '    var body: some View {',
        '        Text("Hello")',
        '    }',
        '}',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'Sources/ContentView.swift');
    assert.ok(meta.skeleton.includes('struct ContentView: View { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('Text("Hello")'));
});

test('Go skeleton skips function bodies', () => {
    const src = [
        'package main',
        'import "fmt"',
        'func main() {',
        '    fmt.Println("secret")',
        '}',
        'type User struct {',
        '    Name string',
        '}',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'main.go');
    assert.ok(meta.skeleton.includes('func main() { /* ... */ }'));
    assert.ok(meta.skeleton.includes('type User struct { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('fmt.Println'));
});

test('Rust skeleton skips function bodies', () => {
    const src = [
        'use std::collections::HashMap;',
        'pub fn greet(name: &str) {',
        '    println!("Hello {}", name);',
        '}',
        'pub struct User { id: u64 }',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'src/lib.rs');
    assert.ok(meta.skeleton.includes('pub fn greet(name: &str) { /* ... */ }'));
    assert.ok(!meta.skeleton.includes('println!'));
});

test('Python skeleton skips indented bodies', () => {
    const src = [
        'import os',
        'class Worker:',
        '    def run(self):',
        '        print("secret")',
        '        return 42',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'worker.py');
    assert.ok(meta.skeleton.includes('class Worker: ...'));
    assert.ok(meta.skeleton.includes('def run(self): ...'));
    assert.ok(!meta.skeleton.includes('print("secret")'));
});

test('Elixir skeleton skips do blocks', () => {
    const src = [
        'defmodule MyApp.User do',
        '  def hello(name) do',
        '    IO.puts("secret")',
        '  end',
        'end',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'lib/my_app/user.ex');
    assert.ok(meta.skeleton.includes('defmodule MyApp.User'));
    assert.ok(!meta.skeleton.includes('IO.puts'));
});

test('Haskell skeleton keeps signatures only', () => {
    const src = [
        'module MyApp where',
        'import Data.Text',
        'data User = User { name :: String }',
        'greet :: String -> String',
        'greet name = "Hello " ++ name',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'src/MyApp.hs');
    assert.ok(meta.skeleton.includes('module MyApp where'));
    assert.ok(meta.skeleton.includes('data User = ...'));
    assert.ok(!meta.skeleton.includes('"Hello " ++ name'));
});

test('framework config files are indexable', () => {
    const { isIndexableFile } = require('../src/context/frameworkFiles');
    assert.ok(isIndexableFile('C:/app/pubspec.yaml'));
    assert.ok(isIndexableFile('C:/app/metro.config.js'));
    assert.ok(isIndexableFile('C:/app/android/app/src/main/AndroidManifest.xml'));
    assert.ok(isIndexableFile('C:/app/ios/Podfile'));
    assert.ok(isIndexableFile('C:/app/eas.json'));
    assert.ok(!isIndexableFile('C:/app/pubspec.lock'));
    assert.ok(!isIndexableFile('C:/app/node_modules/react/index.js'));
    assert.ok(!isIndexableFile('C:/app/lib/model.g.dart'));
    assert.ok(!isIndexableFile('C:/app/ios/Pods/Headers/Public/foo.h'));
});

test('detectFramework identifies Flutter and React Native', () => {
    const { detectFramework } = require('../src/context/framework');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oxygen-fw-'));

    fs.writeFileSync(path.join(tmp, 'pubspec.yaml'), [
        'name: demo',
        'dependencies:',
        '  flutter:',
        '    sdk: flutter',
        '  cupertino_icons: ^1.0.0',
    ].join('\n'));
    assert.strictEqual(detectFramework(tmp).id, 'flutter');

    fs.rmSync(path.join(tmp, 'pubspec.yaml'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
        dependencies: { 'react-native': '0.74.0', react: '18.2.0' },
    }));
    fs.writeFileSync(path.join(tmp, 'metro.config.js'), 'module.exports = {};');
    assert.strictEqual(detectFramework(tmp).id, 'react-native');

    fs.rmSync(tmp, { recursive: true, force: true });
});

test('language groups cover mobile and backend extensions', () => {
    const { detectLanguageGroup } = require('../src/skeleton/language');
    const cases = {
        'lib/main.dart': 'dart',
        'App.kt': 'kotlin',
        'Main.java': 'java',
        'View.swift': 'swift',
        'main.go': 'go',
        'lib.rs': 'rust',
        'app.py': 'python',
        'user.ex': 'elixir',
        'Main.hs': 'haskell',
        'script.lua': 'lua',
        'run.sh': 'shell',
        'App.js': 'javascript',
        'App.jsx': 'javascript',
        'main.cpp': 'cpp',
        'Engine.hpp': 'cpp',
        'index.html': 'html',
        'metro.config.js': 'javascript',
        'pubspec.yaml': 'yaml',
        'AndroidManifest.xml': 'xmlMobile',
        'Podfile': 'ruby',
        'eas.json': 'json',
        'App.tsx': 'cLike',
        'App.vue': 'cLike',
        'schema.sql': 'sql',
        'pubspec.yaml': 'yaml',
        'AndroidManifest.xml': 'xmlMobile',
        'strings.arb': 'json',
    };
    for (const [file, expected] of Object.entries(cases)) {
        assert.strictEqual(detectLanguageGroup(file), expected, file);
    }
});

test('workspace index pattern updates session without opening files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oxygen-'));
    const pricing = resolvePricing(mockConfig({}));
    const session = new SessionTracker(pricing);
    const sources = [
        { rel: 'lib/a.dart', body: buildFakeSource('dart', 120) },
        { rel: 'src/app.js', body: buildFakeSource('js', 90) },
        { rel: 'web/index.html', body: '<!DOCTYPE html><html><head><title>X</title></head><body><main id="app">' + 'x'.repeat(200) + '</main><script>secret();</script></body></html>' },
    ];

    for (const file of sources) {
        const full = path.join(tmp, file.rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, file.body);
        const result = processFile(tmp, full, file.body, pricing);
        session.recordSkeleton(`file://${full}`, file.body, result.skeleton);
    }

    assert.ok(session.getTotalSavedTokens() > 0);
    assert.ok(session.getTotalSavedUSD() > 0);
    fs.rmSync(tmp, { recursive: true, force: true });

    function buildFakeSource(kind, lines) {
        if (kind === 'dart') {
            return [
                "import 'package:flutter/material.dart';",
                'class WidgetA extends StatelessWidget {',
                ...Array.from({ length: lines }, (_, i) => `  void m${i}() { print('line ${i} padding text'); }`),
                '}',
            ].join('\n');
        }
        return [
            "import fs from 'fs';",
            ...Array.from({ length: lines }, (_, i) => `export function fn${i}() { return fs.readFileSync('f${i}.txt'); }`),
        ].join('\n');
    }
});

test('session counter resets to zero', () => {
    const session = new SessionTracker(resolvePricing(mockConfig({})));
    session.recordSkeleton('file:///a.js', 'x'.repeat(400), 'x');
    assert.ok(session.getTotalSavedTokens() > 0);
    session.reset();
    assert.strictEqual(session.getTotalSavedTokens(), 0);
    assert.strictEqual(session.getTotalSavedUSD(), 0);
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

test('session exposes last delta tokens', () => {
    const session = new SessionTracker(resolvePricing(mockConfig({})));
    session.recordSkeleton('file:///a.js', 'x'.repeat(400), 'x');
    assert.strictEqual(session.getLastDeltaTokens(), session.getTotalSavedTokens());
    session.recordSkeleton('file:///a.js', 'x'.repeat(400), 'x');
    assert.strictEqual(session.getLastDeltaTokens(), 0, 're-processing same file has zero delta');
});

test('YAML skeleton collapses dependency lists', () => {
    const src = [
        'name: demo',
        'dependencies:',
        '  http: ^1.0.0',
        '  provider: ^6.0.0',
        '  shared_preferences: ^2.0.0',
        'dev_dependencies:',
        '  flutter_test:',
        '    sdk: flutter',
    ].join('\n');
    const meta = extractSkeletonWithMeta(src, 'pubspec.yaml');
    assert.ok(meta.skeleton.includes('dependencies: [http, provider, shared_preferences]'));
    assert.ok(!meta.skeleton.includes('^1.0.0'));
});

test('JSON skeleton lists dependency keys only', () => {
    const src = JSON.stringify({
        name: 'demo',
        version: '1.0.0',
        dependencies: { react: '^18.0.0', express: '^4.0.0', lodash: '^4.0.0' },
        scripts: { start: 'node index.js', test: 'jest' },
    }, null, 2);
    const meta = extractSkeletonWithMeta(src, 'package.json');
    assert.ok(meta.skeleton.includes('"dependencies": [react, express, lodash]'));
    assert.ok(!meta.skeleton.includes('^18.0.0'));
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
