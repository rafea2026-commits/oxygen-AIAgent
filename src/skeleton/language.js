'use strict';

const path = require('path');
const { FRAMEWORK_BASENAME_TO_GROUP } = require('../context/frameworkFiles');

/** @type {Record<string, string>} */
const EXT_TO_GROUP = {
    // JavaScript / TypeScript / Web
    js: 'javascript',
    jsx: 'javascript',
    ts: 'cLike',
    tsx: 'cLike',
    mjs: 'javascript',
    cjs: 'javascript',
    vue: 'cLike',
    svelte: 'cLike',

    // Mobile — Flutter / Dart
    dart: 'dart',
    arb: 'json',

    // Mobile — iOS / Apple
    swift: 'swift',
    m: 'objc',
    mm: 'objc',
    storyboard: 'xmlMobile',
    xib: 'xmlMobile',
    plist: 'xmlMobile',
    xcconfig: 'yaml',

    // Mobile — Android / Kotlin / Java
    kt: 'kotlin',
    kts: 'kotlin',
    java: 'java',
    gradle: 'gradle',
    xml: 'xmlMobile',
    pro: 'generic',

    // WeChat mini-program
    wxml: 'markup',
    wxss: 'generic',

    // Systems / backend
    go: 'go',
    rs: 'rust',
    py: 'python',
    pyw: 'python',
    rb: 'ruby',
    erb: 'ruby',
    php: 'php',
    ex: 'elixir',
    exs: 'elixir',
    hs: 'haskell',
    lua: 'lua',
    r: 'generic',
    sql: 'sql',

    // Shell / scripts
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'shell',
    bat: 'shell',
    cmd: 'shell',

    // C family
    c: 'cpp',
    h: 'cpp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    cs: 'cLike',
    scala: 'cLike',
    groovy: 'cLike',

    // Markup / config / data
    html: 'html',
    htm: 'html',
    svg: 'markup',
    css: 'generic',
    scss: 'generic',
    sass: 'generic',
    less: 'generic',
    json: 'json',
    jsonc: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'yaml',
    md: 'generic',
    properties: 'yaml',
    env: 'yaml',
    ini: 'yaml',
    cfg: 'yaml',
    conf: 'yaml',
};

/** @type {Record<string, string>} */
const BASENAME_TO_GROUP = {
    ...FRAMEWORK_BASENAME_TO_GROUP,
    'project.pbxproj': 'generic',
};

/**
 * @param {string} [filePath]
 * @returns {string}
 */
function detectLanguageGroup(filePath) {
    if (!filePath) {
        return 'generic';
    }

    const base = path.basename(filePath);
    const baseLower = base.toLowerCase();

    if (BASENAME_TO_GROUP[base] || BASENAME_TO_GROUP[baseLower]) {
        return BASENAME_TO_GROUP[base] || BASENAME_TO_GROUP[baseLower];
    }

    if (baseLower.endsWith('.gradle.kts') || baseLower.endsWith('.gradle')) {
        return 'gradle';
    }

    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    return EXT_TO_GROUP[ext] ?? 'generic';
}

module.exports = { detectLanguageGroup, EXT_TO_GROUP, BASENAME_TO_GROUP };
