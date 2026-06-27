'use strict';

const path = require('path');
const fs = require('fs');

const MARKER_START = '# --- Oxygen Geo-Fence (auto) ---';
const MARKER_END = '# --- End Oxygen Geo-Fence ---';

/**
 * Find nearest project root walking up from a file.
 * @param {string} filePath
 * @param {string} workspaceRoot
 */
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

/**
 * Build allowed scope from active file without fixed frontend/backend layout.
 * @param {string} activeFilePath absolute path
 * @param {string} workspaceRoot
 * @param {number} depth parent folders to include above file dir
 */
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

    // Always allow common shared/config paths relative to project root
    const sharedPatterns = [
        'README.md',
        'LICENSE',
        '.oxygen/**',
        'shared/**',
        'common/**',
        'lib/**',
        'utils/**',
        'types/**',
        'config/**',
        'docs/**',
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

/**
 * List top-level dirs/files in project to block (outside allowed globs).
 * @param {string} projectRoot
 * @param {string[]} allowedGlobs
 */
function computeBlockedGlobs(projectRoot, allowedGlobs) {
    if (!fs.existsSync(projectRoot)) {
        return [];
    }

    const allowedRoots = new Set(
        allowedGlobs
            .map((g) => g.replace(/\/\*\*$/, '').replace(/\*\*$/, ''))
            .filter(Boolean)
    );

    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    const blocked = [];

    for (const entry of entries) {
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

/**
 * @param {string} workspaceRoot
 * @param {import('./index').GeoScope} scope
 */
function writeScopeArtifacts(workspaceRoot, scope) {
    const oxygenDir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(oxygenDir)) {
        fs.mkdirSync(oxygenDir, { recursive: true });
    }

    const blocked = computeBlockedGlobs(scope.projectRoot, scope.allowedGlobs);
    const payload = {
        generatedAt: new Date().toISOString(),
        scopeLabel: scope.scopeLabel,
        projectRoot: scope.projectRoot,
        activeFile: scope.activeFile,
        allowedGlobs: scope.allowedGlobs,
        blockedGlobs: blocked,
        hint: 'Attach only files matching allowedGlobs when prompting your AI agent.',
    };

    fs.writeFileSync(path.join(oxygenDir, 'context-scope.json'), JSON.stringify(payload, null, 2), 'utf8');

    const ignoreLines = [
        MARKER_START,
        `# Scope: ${scope.scopeLabel}`,
        `# Allowed: ${scope.allowedGlobs.join(', ')}`,
        ...blocked.map((g) => g),
        MARKER_END,
        '',
    ].join('\n');

    updateIgnoreFile(path.join(workspaceRoot, '.cursorignore'), ignoreLines);
    updateIgnoreFile(path.join(workspaceRoot, '.copilotignore'), ignoreLines);

    return { blocked, payload };
}

/**
 * @param {string} ignorePath
 * @param {string} section
 */
function updateIgnoreFile(ignorePath, section) {
    let existing = '';
    if (fs.existsSync(ignorePath)) {
        existing = fs.readFileSync(ignorePath, 'utf8');
    }

    const startIdx = existing.indexOf(MARKER_START);
    const endIdx = existing.indexOf(MARKER_END);

    let next;
    if (startIdx !== -1 && endIdx !== -1) {
        next = existing.slice(0, startIdx) + section + existing.slice(endIdx + MARKER_END.length);
    } else {
        next = (existing.trimEnd() ? existing.trimEnd() + '\n\n' : '') + section;
    }

    fs.writeFileSync(ignorePath, next, 'utf8');
}

module.exports = {
    MARKER_START,
    MARKER_END,
    findProjectRoot,
    computeScope,
    computeBlockedGlobs,
    writeScopeArtifacts,
};
