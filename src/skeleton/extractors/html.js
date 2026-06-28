'use strict';

const path = require('path');

const STRUCTURAL_TAGS = new Set([
    'html', 'head', 'body', 'header', 'nav', 'main', 'section', 'article',
    'aside', 'footer', 'form', 'table', 'thead', 'tbody', 'tr', 'template',
]);

/**
 * Compact tag representation: name + id + primary class.
 * @param {string} tag
 */
function compactTag(tag) {
    const name = tag.match(/^<\/?([a-zA-Z][\w-]*)/)?.[1]?.toLowerCase() ?? 'tag';
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const cls = tag.match(/\bclass=["']([^"']+)["']/i)?.[1]?.split(/\s+/).slice(0, 2).join('.');

    let out = `<${name}`;
    if (id) {
        out += ` id="${id}"`;
    }
    if (cls) {
        out += ` class="${cls}"`;
    }
    if (/\/>\s*$/.test(tag)) {
        out += ' /';
    }
    return `${out}>`;
}

/**
 * HTML skeleton — structure, assets, ids/classes; inline script/style collapsed.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractHtmlSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const output = [];
    const seen = new Set();

    const add = (line) => {
        const key = line.trim();
        if (key && !seen.has(key)) {
            seen.add(key);
            output.push(key);
        }
    };

    const doctype = source.match(/<!DOCTYPE[^>]*>/i)?.[0];
    if (doctype) {
        add(doctype);
    }

    const title = source.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    if (title) {
        add(`<title>${title}</title>`);
    }

    for (const m of source.matchAll(/<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi)) {
        add(`<meta ...="${m[1]}" />`);
    }

    for (const m of source.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi)) {
        add(`<link rel="stylesheet" href="${m[1]}" />`);
    }
    for (const m of source.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi)) {
        add(`<link rel="stylesheet" href="${m[1]}" />`);
    }

    for (const m of source.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
        add(`<script src="${m[1]}"></script>`);
    }
    if (/<script(?:\s|>)/i.test(source) && ![...seen].some((l) => l.startsWith('<script src='))) {
        add('<script>/* ... */</script>');
    }

    if (/<style[\s>]/i.test(source)) {
        add('<style>/* ... */</style>');
    }

    for (const m of source.matchAll(/<([a-zA-Z][\w-]*)[^>]*>/g)) {
        const tagName = m[1].toLowerCase();
        if (STRUCTURAL_TAGS.has(tagName) || m[0].includes('id=') || m[0].includes('class=')) {
            add(compactTag(m[0]));
        }
    }

    if (output.length <= 2) {
        const tags = source.match(/<[a-zA-Z][\w-]*(?:\s+[\w-]+(?:="[^"]*")?)*\s*\/?>/g) || [];
        for (const tag of [...new Set(tags)].slice(0, 40)) {
            add(compactTag(tag));
        }
    }

    const header = filePath
        ? `<!-- Oxygen Skeleton (HTML): ${path.basename(filePath)} -->\n`
        : '';
    return header + output.join('\n');
}

module.exports = { extractHtmlSkeleton };
