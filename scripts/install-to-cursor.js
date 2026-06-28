'use strict';

const fs = require('fs');
const path = require('path');

const sourceRoot = process.argv[2] || path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
const version = pkg.version;
const publisher = pkg.publisher;
const name = pkg.name;
const extId = `${publisher}.${name}`;
const folderName = `${extId}-${version}`;

const cursorExtRoot = path.join(process.env.USERPROFILE || process.env.HOME, '.cursor', 'extensions');
const target = path.join(cursorExtRoot, folderName);
const registryPath = path.join(cursorExtRoot, 'extensions.json');
const obsoletePath = path.join(cursorExtRoot, '.obsolete');

function readJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return raw.trim() ? JSON.parse(raw) : fallback;
}

function copyDir(src, dest, exclude) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (exclude.has(entry.name) || entry.name.endsWith('.vsix')) {
            continue;
        }
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(from, to, exclude);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

function toUnixPath(absPath) {
    const normalized = absPath.replace(/\\/g, '/');
    const m = normalized.match(/^([A-Za-z]):\/(.*)$/);
    return m ? `/${m[1].toLowerCase()}/${m[2]}` : normalized;
}

console.log('Oxygen install -> Cursor');
console.log(`  Version: ${version}`);
console.log(`  Target:  ${target}`);

fs.mkdirSync(cursorExtRoot, { recursive: true });

for (const dir of fs.readdirSync(cursorExtRoot, { withFileTypes: true })) {
    if (dir.isDirectory() && dir.name.startsWith('oxygen.oxygen-aiagent-')) {
        fs.rmSync(path.join(cursorExtRoot, dir.name), { recursive: true, force: true });
        console.log(`Removed old: ${dir.name}`);
    }
}

if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}

copyDir(sourceRoot, target, new Set(['node_modules', '.git', '.vscode-test', 'test', '.oxygen', 'package-lock.json']));

const obsolete = readJson(obsoletePath, {});
let changed = false;
for (const key of Object.keys(obsolete)) {
    if (key.startsWith('oxygen.oxygen-aiagent-')) {
        delete obsolete[key];
        changed = true;
        console.log(`Removed from .obsolete: ${key}`);
    }
}
if (changed) {
    fs.writeFileSync(obsoletePath, JSON.stringify(obsolete));
}

const raw = readJson(registryPath, []);
/** @type {object[]} */
let list = Array.isArray(raw) ? raw : [];
if (list[0] && list[0].value && Array.isArray(list[0].value)) {
    list = [...list[0].value, ...list.slice(1)];
}

list = list.filter((entry, index, self) =>
    entry?.identifier?.id &&
    index === self.findIndex((x) => x.identifier.id === entry.identifier.id) &&
    entry.identifier.id !== extId &&
    !entry.Count
);

list.push({
    identifier: { id: extId },
    version,
    location: {
        $mid: 1,
        fsPath: target,
        _sep: 1,
        external: `file:///${target.replace(/\\/g, '/')}`,
        path: toUnixPath(target),
        scheme: 'file',
    },
    relativeLocation: folderName,
    metadata: {
        installedTimestamp: Date.now(),
        pinned: false,
        source: 'vsix',
        publisherDisplayName: 'Harith Riad Hassan & Rafea Read Hussein',
        isPreReleaseVersion: false,
        hasPreReleaseVersion: false,
    },
});

fs.writeFileSync(registryPath, JSON.stringify(list));

console.log('');
console.log(`Installed and registered: ${folderName}`);
console.log(`Registry entries: ${list.length}`);
console.log('');
console.log('Next: close Cursor completely, reopen, open a code file.');
console.log('Look for: O2 Oxygen | -tok | $saved (bottom-left)');
