'use strict';

const path = require('path');
const fs = require('fs');
const { extractSkeletonWithMeta } = require('./skeleton');
const { calculateSavings } = require('./core/tokens');

/**
 * @param {string} workspaceRoot
 */
function ensureOxygenDir(workspaceRoot) {
    const dir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * @param {string} workspaceRoot
 * @param {string} relativePath
 * @param {string} skeleton
 */
function cacheSkeleton(workspaceRoot, relativePath, skeleton) {
    const dir = path.join(ensureOxygenDir(workspaceRoot), 'skeletons');
    const safeName = relativePath.replace(/[\\/:*?"<>|]/g, '_');
    const cachePath = path.join(dir, `${safeName}.skel.txt`);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(cachePath, skeleton, 'utf8');
    return cachePath;
}

/**
 * @param {string} workspaceRoot
 * @param {string} filePath absolute
 * @param {string} source
 * @param {{ inputPerMillion: number }} pricing
 */
function processFile(workspaceRoot, filePath, source, pricing) {
    const meta = extractSkeletonWithMeta(source, filePath);
    const rel = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
    const cachePath = cacheSkeleton(workspaceRoot, rel, meta.skeleton);
    const savings = calculateSavings(source, meta.skeleton, pricing);

    return { ...meta, rel, cachePath, savings };
}

module.exports = {
    ensureOxygenDir,
    cacheSkeleton,
    processFile,
};
