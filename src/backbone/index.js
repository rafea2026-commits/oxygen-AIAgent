'use strict';

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../geoFence');

const BACKBONE_FILE = '.agent_backbone.yaml';
const RULES_MARKER = '<!-- oxygen:backbone -->';

/**
 * Detect stack hints from project files.
 * @param {string} projectRoot
 */
function detectStack(projectRoot) {
    const stack = [];
    const checks = [
        ['package.json', 'Node.js'],
        ['tsconfig.json', 'TypeScript'],
        ['pyproject.toml', 'Python'],
        ['requirements.txt', 'Python'],
        ['Cargo.toml', 'Rust'],
        ['go.mod', 'Go'],
        ['pubspec.yaml', 'Flutter/Dart'],
        ['composer.json', 'PHP'],
        ['Gemfile', 'Ruby'],
        ['pom.xml', 'Java/Maven'],
        ['build.gradle', 'Java/Gradle'],
        ['*.csproj', 'C#/.NET'],
    ];

    for (const [file, label] of checks) {
        if (file.includes('*')) {
            const dir = fs.readdirSync(projectRoot);
            if (dir.some((f) => f.endsWith('.csproj'))) {
                stack.push('C#/.NET');
            }
        } else if (fs.existsSync(path.join(projectRoot, file))) {
            stack.push(label);
        }
    }

    return stack.length ? stack : ['Unknown — update .agent_backbone.yaml'];
}

/**
 * @param {string} workspaceRoot
 * @param {string} [activeFilePath]
 */
function buildBackboneContent(workspaceRoot, activeFilePath) {
    const projectRoot = activeFilePath
        ? findProjectRoot(activeFilePath, workspaceRoot)
        : workspaceRoot;

    const projectName = path.basename(projectRoot);
    const stack = detectStack(projectRoot);
    const scopeHint = activeFilePath
        ? path.relative(projectRoot, path.dirname(activeFilePath)).replace(/\\/g, '/')
        : '.';

    return `# Oxygen Agent Backbone — ${projectName}
# Auto-generated. Edit freely; Oxygen will merge on sync.

project: ${projectName}
stack:
${stack.map((s) => `  - ${s}`).join('\n')}

focus_scope: ${scopeHint || '.'}

rules:
  - Stay inside focus_scope unless the user explicitly asks to expand context.
  - Prefer skeleton summaries from .oxygen/skeletons/ over full file bodies.
  - Do not modify node_modules, dist, build, or vendor directories.
  - Keep answers concise; avoid repeating the same code block.
  - If stuck in a loop, stop and ask one clarifying question.

token_saver:
  - Use signatures/skeletons instead of full files when exploring.
  - Ignore blocked paths listed in .oxygen/context-scope.json.

anti_hallucination:
  - Verify file paths exist before referencing them.
  - Do not invent APIs; read project backbone and nearby files first.
`;
}

/**
 * @param {string} workspaceRoot
 * @param {string} [activeFilePath]
 */
function syncBackbone(workspaceRoot, activeFilePath) {
    const oxygenDir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(oxygenDir)) {
        fs.mkdirSync(oxygenDir, { recursive: true });
    }

    const content = buildBackboneContent(workspaceRoot, activeFilePath);
    const backbonePath = path.join(oxygenDir, BACKBONE_FILE);
    fs.writeFileSync(backbonePath, content, 'utf8');

    syncCursorRule(workspaceRoot, content);
    syncCopilotInstructions(workspaceRoot, content);

    return { backbonePath, content };
}

/**
 * @param {string} workspaceRoot
 * @param {string} content
 */
function syncCursorRule(workspaceRoot, content) {
    const rulesDir = path.join(workspaceRoot, '.cursor', 'rules');
    if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
    }

    const rulePath = path.join(rulesDir, 'oxygen-backbone.mdc');
    const body = `---
description: Oxygen agent backbone — project constants and boundaries
alwaysApply: true
---

${RULES_MARKER}

${content}
`;
    fs.writeFileSync(rulePath, body, 'utf8');
}

/**
 * @param {string} workspaceRoot
 * @param {string} content
 */
function syncCopilotInstructions(workspaceRoot, content) {
    const copilotPath = path.join(workspaceRoot, '.github', 'copilot-instructions.md');
    const githubDir = path.dirname(copilotPath);

    if (!fs.existsSync(githubDir)) {
        fs.mkdirSync(githubDir, { recursive: true });
    }

    let existing = '';
    if (fs.existsSync(copilotPath)) {
        existing = fs.readFileSync(copilotPath, 'utf8');
    }

    const block = `${RULES_MARKER}\n\n${content}\n`;
    if (existing.includes(RULES_MARKER)) {
        const start = existing.indexOf(RULES_MARKER);
        const next = existing.slice(0, start) + block;
        fs.writeFileSync(copilotPath, next, 'utf8');
    } else {
        fs.writeFileSync(copilotPath, (existing.trimEnd() ? existing.trimEnd() + '\n\n' : '') + block, 'utf8');
    }
}

module.exports = {
    BACKBONE_FILE,
    buildBackboneContent,
    syncBackbone,
};
