'use strict';

const path = require('path');

/** @type {Record<string, string>} */
const EXT_TO_GROUP = {
    // JavaScript / TypeScript / Web
    js: 'cLike',
    jsx: 'cLike',
    ts: 'cLike',
    tsx: 'cLike',
    mjs: 'cLike',
    cjs: 'cLike',
    vue: 'cLike',
    svelte: 'cLike',

    // Mobile — Flutter / Dart
    dart: 'dart',

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

    // Mobile — React Native / cross-platform configs
    arb: 'json',

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
    lua: 'generic',
    r: 'generic',
    sql: 'sql',

    // C family (native mobile modules, JNI, etc.)
    c: 'cLike',
    h: 'cLike',
    cpp: 'cLike',
    cc: 'cLike',
    cxx: 'cLike',
    hpp: 'cLike',
    cs: 'cLike',
    scala: 'cLike',
    groovy: 'cLike',

    // Markup / config / data
    html: 'markup',
    htm: 'markup',
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
    sh: 'generic',
    bash: 'generic',
    zsh: 'generic',
    ps1: 'generic',
    bat: 'generic',
    cmd: 'generic',
    properties: 'yaml',
    env: 'yaml',
    ini: 'yaml',
    cfg: 'yaml',
    conf: 'yaml',
};

/** Filename-based detection (mobile build files). */
const BASENAME_TO_GROUP = {
    'pubspec.yaml': 'yaml',
    'pubspec.lock': 'yaml',
    'build.gradle': 'gradle',
    'settings.gradle': 'gradle',
    'gradle.properties': 'yaml',
    'AndroidManifest.xml': 'xmlMobile',
    'Info.plist': 'xmlMobile',
    Podfile: 'ruby',
    Gemfile: 'ruby',
    'app.config.js': 'cLike',
    'app.config.ts': 'cLike',
    'metro.config.js': 'cLike',
    'react-native.config.js': 'cLike',
    'capacitor.config.json': 'json',
    'capacitor.config.ts': 'cLike',
    'ionic.config.json': 'json',
    'eas.json': 'json',
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
