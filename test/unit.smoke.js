'use strict';

const assert = require('assert');
const path = require('path');
const { estimateTokens, calculateSavings, minifyText } = require('../src/core/tokens');
const { resolvePricing, PRICING_PRESETS } = require('../src/core/pricing');
const { extractSkeletonWithMeta } = require('../src/skeleton');
const { detectHallucination } = require('../src/hallucination/detector');
const { SessionActivity, buildSessionSummary } = require('../src/session/summary');
const { SessionTracker } = require('../src/core/session');

function mockConfig(values) {
    return {
        get: (key, defaultValue) => (key in values ? values[key] : defaultValue),
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

console.log('Oxygen unit smoke tests\n');

test('estimateTokens', () => {
    assert.strictEqual(estimateTokens(''), 0);
    assert.strictEqual(estimateTokens('abcd'), 1);
});

test('pricing preset composer default', () => {
    const p = resolvePricing(mockConfig({}));
    assert.strictEqual(p.preset, 'composer');
    assert.strictEqual(p.inputPerMillion, PRICING_PRESETS.composer.inputPerMillion);
});

test('JS skeleton', () => {
    const src = `import fs from 'fs';\n\nexport function greet(name: string) {\n  console.log(name);\n  return name;\n}\n\nexport class User {\n  constructor(id: number) {\n    this.id = id;\n  }\n  save() { return fs.writeFileSync('x', 'y'); }\n}`;
    const meta = extractSkeletonWithMeta(src, 'a.ts');
    assert.ok(meta.skeleton.includes('greet'));
    assert.ok(meta.skeleton.length <= src.length);
});

test('Go skeleton', () => {
    const src = 'package main\n\nimport "fmt"\n\nfunc Hello(name string) string {\n\treturn name\n}\n\ntype User struct {\n\tID int\n}\n';
    const meta = extractSkeletonWithMeta(src, 'main.go');
    assert.ok(meta.languageGroup === 'go');
    assert.ok(meta.skeleton.includes('func Hello'));
    assert.ok(meta.skeleton.includes('type User'));
});

test('Rust skeleton', () => {
    const src = 'use std::io;\n\npub fn greet(name: &str) -> String {\n    name.to_string()\n}\n\npub struct User { pub id: u32 }\n';
    const meta = extractSkeletonWithMeta(src, 'lib.rs');
    assert.ok(meta.languageGroup === 'rust');
    assert.ok(meta.skeleton.includes('pub fn greet'));
    assert.ok(meta.skeleton.includes('pub struct User'));
});

test('SQL skeleton', () => {
    const src = `CREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(255)\n);\n\nSELECT id, email FROM users WHERE active = 1;`;
    const meta = extractSkeletonWithMeta(src, 'schema.sql');
    assert.ok(meta.languageGroup === 'sql');
    assert.ok(meta.skeleton.includes('CREATE TABLE'));
    assert.ok(meta.skeleton.includes('SELECT'));
});

test('hallucination detects broken braces', () => {
    const bad = 'function foo() {\n  if (true) {\n    return 1;\n';
    const r = detectHallucination(bad, 'x.js', process.cwd());
    assert.ok(r.score > 0);
    assert.ok(r.findings.length > 0);
});

test('hallucination detects placeholder phrases', () => {
    const r = detectHallucination('// TODO: implement placeholder API for example.com', 'x.ts', process.cwd());
    assert.ok(r.signals.phrases > 0);
});

test('session summary builds markdown', () => {
    const activity = new SessionActivity();
    activity.touchFile('src/a.ts');
    activity.setScope('src/features');
    const session = new SessionTracker(resolvePricing(mockConfig({})));
    const md = buildSessionSummary({
        activity,
        session,
        pricing: resolvePricing(mockConfig({})),
        activeFile: 'src/a.ts',
    });
    assert.ok(md.includes('Session Summary'));
    assert.ok(md.includes('src/a.ts'));
});

console.log(`\n${passed} passed`);
