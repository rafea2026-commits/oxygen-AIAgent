'use strict';

const path = require('path');
const fs = require('fs');

function findProjectRoot(filePath, workspaceRoot) {
    let dir = path.dirname(filePath);
    const stop = path.resolve(workspaceRoot || dir);

    while (true) {
        const markers = ['.git', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'pubspec.yaml', 'composer.json', 'Gemfile', '.sln', 'CMakeLists.txt'];
        for (const marker of markers) {
            if (fs.existsSync(path.join(dir, marker))) {
                return dir;
            }
        }
        if (path.resolve(dir) === stop) {
            return stop;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return stop;
}

function computeScope(activeFilePath, workspaceRoot, depth = 2) {
    const projectRoot = findProjectRoot(activeFilePath, workspaceRoot);
    const fileDir = path.dirname(activeFilePath);
    const allowedDirs = new Set();
    let current = fileDir;

    for (let i = 0; i <= depth; i++) {
        allowedDirs.add(current);
        if (current === projectRoot) {
            break;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }

    const sharedPatterns = [
        'README.md', 'LICENSE', '.oxygen/**',
        'shared/**', 'common/**', 'lib/**', 'utils/**', 'types/**', 'config/**', 'docs/**',
    ];

    const relAllowed = [...allowedDirs].map((d) => {
        const rel = path.relative(projectRoot, d).replace(/\\/g, '/');
        return rel ? `${rel}/**` : '**';
    });

    return {
        projectRoot,
        activeFile: activeFilePath,
        allowedGlobs: [...new Set([...relAllowed, ...sharedPatterns])],
        scopeLabel: path.relative(projectRoot, fileDir).replace(/\\/g, '/') || '.',
    };
}

function computeBlockedGlobs(projectRoot, allowedGlobs) {
    if (!fs.existsSync(projectRoot)) {
        return [];
    }

    const allowedRoots = new Set(
        allowedGlobs.map((g) => g.replace(/\/\*\*$/, '').replace(/\*\*$/, '')).filter(Boolean)
    );

    const blocked = [];
    for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
        if (entry.name.startsWith('.') && entry.name !== '.oxygen') {
            continue;
        }
        if (['node_modules', 'dist', 'build', 'out', 'target', '.git'].includes(entry.name)) {
            blocked.push(`${entry.name}/**`);
            continue;
        }
        const rel = entry.name;
        const isAllowed = [...allowedRoots].some((root) => {
            if (root === '**') {
                return true;
            }
            return rel === root || rel.startsWith(`${root}/`) || root.startsWith(`${rel}/`);
        });
        if (!isAllowed && entry.isDirectory()) {
            blocked.push(`${rel}/**`);
        }
    }
    return blocked;
}

function writeScopeArtifacts(workspaceRoot, scope) {
    const oxygenDir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(oxygenDir)) {
        fs.mkdirSync(oxygenDir, { recursive: true });
    }

    const blocked = computeBlockedGlobs(scope.projectRoot, scope.allowedGlobs);
    const payload = {
        generatedAt: new Date().toISOString(),
        scopeLabel: scope.scopeLabel,
        allowedGlobs: scope.allowedGlobs,
        blockedGlobs: blocked,
        hint: 'Focus scope for context bundle — informational only, does not block Agent.',
    };

    fs.writeFileSync(path.join(oxygenDir, 'context-scope.json'), JSON.stringify(payload, null, 2), 'utf8');

    return { blocked, payload };
}

module.exports = {
    computeScope,
    computeBlockedGlobs,
    writeScopeArtifacts,
};
