'use strict';

const assert = require('assert');
const { estimateTokens, calculateSavings, minifyText } = require('../src/core/tokens');
const { extractSkeletonWithMeta } = require('../src/skeleton');
const { computeScope, computeBlockedGlobs } = require('../src/geoFence');
const { buildBackboneContent } = require('../src/backbone');

suite('Oxygen Core Tests', () => {
    test('estimateTokens handles empty input', () => {
        assert.strictEqual(estimateTokens(''), 0);
        assert.strictEqual(estimateTokens('abcd'), 1);
    });

    test('minifyText removes line comments', () => {
        const input = 'const x = 1;\n// comment\nconst y = 2;';
        const out = minifyText(input);
        assert.ok(!out.includes('comment'));
        assert.ok(out.includes('const x = 1;'));
    });

    test('calculateSavings returns non-negative savings', () => {
        const raw = 'function hello() {\n  // big comment\n  return 1;\n}\n';
        const cleaned = minifyText(raw);
        const result = calculateSavings(raw, cleaned, { inputPerMillion: 3 });
        assert.ok(result.savedTokens >= 0);
    });
});

suite('Oxygen Skeleton Tests', () => {
    test('extracts JS skeleton', () => {
        const src = `import fs from 'fs';\n\nexport function greet(name) {\n  console.log(name);\n}\n\nexport class User {\n  constructor(id) {\n    this.id = id;\n  }\n}`;
        const meta = extractSkeletonWithMeta(src, 'file.ts');
        assert.ok(meta.skeleton.includes('export function greet'));
        assert.ok(meta.skeleton.includes('export class User'));
        assert.ok(meta.skeleton.length < src.length);
    });

    test('extracts Python skeleton', () => {
        const src = 'import os\n\nclass Foo:\n    def bar(self):\n        return 1\n';
        const meta = extractSkeletonWithMeta(src, 'mod.py');
        assert.ok(meta.skeleton.includes('class Foo'));
        assert.ok(meta.skeleton.includes('def bar'));
        assert.ok(meta.languageGroup === 'python');
    });
});

suite('Oxygen Geo-Fence Tests', () => {
    test('computeScope builds allowed globs from file path', () => {
        const root = 'C:\\project';
        const file = 'C:\\project\\src\\features\\auth\\login.ts';
        const scope = computeScope(file, root, 2);
        assert.ok(scope.allowedGlobs.some((g) => g.includes('auth')));
        assert.strictEqual(scope.projectRoot, root);
    });

    test('computeBlockedGlobs returns array', () => {
        const blocked = computeBlockedGlobs(process.cwd(), ['src/**']);
        assert.ok(Array.isArray(blocked));
    });
});

suite('Oxygen Backbone Tests', () => {
    test('buildBackboneContent includes project name', () => {
        const content = buildBackboneContent(process.cwd());
        assert.ok(content.includes('project:'));
        assert.ok(content.includes('rules:'));
    });
});
