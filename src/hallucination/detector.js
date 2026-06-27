'use strict';

const fs = require('fs');
const path = require('path');

const HALLUCINATION_PHRASES = [
    /\bas an ai language model\b/i,
    /\bi (?:don't|do not) have access to (?:your|the) (?:codebase|files?|project)\b/i,
    /\b(?:assume|assuming) (?:this|the) file (?:exists|structure)\b/i,
    /\bplaceholder(?: implementation)?\b/i,
    /\btodo:\s*implement\b/i,
    /\bexample\.com\b/i,
    /\bfoo\.bar\b/i,
    /\bmy(?:Fake|NonExistent)Api\b/i,
    /\b\[.*?(?:your|insert).*?\]/i,
];

const PATH_LIKE = /(?:['"`])(\.{0,2}\/?[\w./-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|dart|php|rb|sql|json|yaml|yml|md|css|html))(?:['"`])/g;
const RELATIVE_IMPORT = /\b(?:import|from|require)\s*(?:\([^)]*['"](\.[^'"]+)['"]|\(?['"](\.[^'"]+)['"])/g;

/**
 * @param {string} text
 */
function syntaxBreakageScore(text) {
    let score = 0;
    const pairs = [['{', '}'], ['[', ']'], ['(', ')']];

    for (const [open, close] of pairs) {
        const opens = (text.match(new RegExp('\\' + open, 'g')) || []).length;
        const closes = (text.match(new RegExp('\\' + close, 'g')) || []).length;
        const diff = Math.abs(opens - closes);
        if (diff > 0) {
            score += Math.min(diff * 8, 30);
        }
    }

    const unclosedStrings = (text.match(/(['"`])(?:(?!\1)[^\\]|\\.)*$/gm) || []).length;
    score += unclosedStrings * 10;

    return Math.min(score, 40);
}

/**
 * @param {string} text
 */
function repetitionScore(text) {
    const lines = text.split(/\r?\n/);
    const seen = new Map();
    let repeats = 0;

    for (const line of lines) {
        const key = line.trim().replace(/\s+/g, ' ');
        if (key.length < 24) {
            continue;
        }
        const count = (seen.get(key) ?? 0) + 1;
        seen.set(key, count);
        if (count === 3) {
            repeats++;
        }
    }

    const funcNames = [...text.matchAll(/\b(?:function|def|fn|func)\s+(\w+)/g)].map((m) => m[1]);
    const dupFuncs = funcNames.filter((n, i) => funcNames.indexOf(n) !== i);
    const nearDup = dupFuncs.length * 12;

    return Math.min(repeats * 10 + nearDup, 35);
}

/**
 * @param {string} text
 */
function phraseScore(text) {
    let hits = 0;
    for (const re of HALLUCINATION_PHRASES) {
        if (re.test(text)) {
            hits++;
        }
    }
    return Math.min(hits * 12, 36);
}

/**
 * @param {string} text
 * @param {string} workspaceRoot
 */
function phantomPathScore(text, workspaceRoot) {
    if (!workspaceRoot) {
        return { score: 0, findings: [] };
    }

    const findings = [];
    const checked = new Set();

    for (const match of text.matchAll(PATH_LIKE)) {
        const rel = match[1].replace(/^\.\//, '');
        if (checked.has(rel) || rel.includes('*')) {
            continue;
        }
        checked.add(rel);

        const full = path.join(workspaceRoot, rel);
        if (!fs.existsSync(full)) {
            findings.push(`مسار وهمي محتمل: ${rel}`);
        }
    }

    for (const match of text.matchAll(RELATIVE_IMPORT)) {
        const rel = (match[1] || match[2] || '').replace(/^\.\//, '');
        if (!rel || checked.has(rel)) {
            continue;
        }
        checked.add(rel);

        const candidates = [
            path.join(workspaceRoot, rel),
            path.join(workspaceRoot, rel + '.ts'),
            path.join(workspaceRoot, rel + '.js'),
            path.join(workspaceRoot, rel + '.tsx'),
            path.join(workspaceRoot, rel + '.py'),
            path.join(workspaceRoot, rel + '.go'),
            path.join(workspaceRoot, rel + '.rs'),
            path.join(workspaceRoot, rel, 'index.js'),
            path.join(workspaceRoot, rel, 'index.ts'),
        ];

        if (!candidates.some((c) => fs.existsSync(c))) {
            findings.push(`استيراد لمسار غير موجود: ${rel}`);
        }
    }

    return {
        score: Math.min(findings.length * 15, 45),
        findings,
    };
}

/**
 * @param {string} text
 * @param {string} [filePath]
 * @param {string} [workspaceRoot]
 */
function detectHallucination(text, filePath, workspaceRoot) {
    if (!text || text.length < 40) {
        return {
            score: 0,
            level: 'ok',
            findings: [],
            signals: {},
        };
    }

    const syntax = syntaxBreakageScore(text);
    const repetition = repetitionScore(text);
    const phrases = phraseScore(text);
    const phantom = phantomPathScore(text, workspaceRoot);

    const findings = [...phantom.findings];

    if (syntax >= 8) {
        findings.push('أقواس أو quotes غير متوازنة — كود قد يكون مكسوراً');
    }
    if (repetition >= 20) {
        findings.push('تكرار أسطر أو دوال — Agent قد يكون في حلقة');
    }
    if (phrases >= 12) {
        findings.push('عبارات placeholder/shim شائعة في الهلوسة');
    }

    const score = Math.min(100, syntax + repetition + phrases + phantom.score);
    let level = 'ok';
    if (score >= 55) {
        level = 'critical';
    } else if (score >= 30) {
        level = 'warning';
    } else if (score >= 15) {
        level = 'watch';
    }

    return {
        score,
        level,
        findings,
        signals: { syntax, repetition, phrases, phantom: phantom.score },
        filePath: filePath ? path.basename(filePath) : undefined,
    };
}

module.exports = { detectHallucination };
