'use strict';

/** @type {Record<string, string>} */
const EXT_TO_GROUP = {
    js: 'cLike',
    jsx: 'cLike',
    ts: 'cLike',
    tsx: 'cLike',
    mjs: 'cLike',
    cjs: 'cLike',
    java: 'cLike',
    kt: 'cLike',
    kts: 'cLike',
    swift: 'cLike',
    cs: 'cLike',
    cpp: 'cLike',
    cc: 'cLike',
    cxx: 'cLike',
    c: 'cLike',
    h: 'cLike',
    hpp: 'cLike',
    go: 'go',
    rs: 'rust',
    dart: 'cLike',
    scala: 'cLike',
    groovy: 'cLike',
    php: 'php',
    py: 'python',
    pyw: 'python',
    rb: 'ruby',
    erb: 'ruby',
    ex: 'elixir',
    exs: 'elixir',
    hs: 'haskell',
    lua: 'generic',
    r: 'generic',
    sql: 'sql',
    sh: 'generic',
    bash: 'generic',
    zsh: 'generic',
    ps1: 'generic',
    html: 'markup',
    htm: 'markup',
    xml: 'markup',
    svg: 'markup',
    css: 'generic',
    scss: 'generic',
    sass: 'generic',
    less: 'generic',
    json: 'generic',
    yaml: 'generic',
    yml: 'generic',
    toml: 'generic',
    md: 'generic',
    vue: 'cLike',
    svelte: 'cLike',
};

/**
 * @param {string} [filePath]
 * @returns {string}
 */
function detectLanguageGroup(filePath) {
    if (!filePath) {
        return 'generic';
    }

    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    return EXT_TO_GROUP[ext] ?? 'generic';
}

module.exports = { detectLanguageGroup, EXT_TO_GROUP };
