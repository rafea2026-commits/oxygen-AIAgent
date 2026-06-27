'use strict';

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSqlSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const cleaned = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '');

    const output = [];
    const seen = new Set();

    const add = (line) => {
        const key = line.trim();
        if (key && !seen.has(key)) {
            seen.add(key);
            output.push(key);
        }
    };

    // CREATE TABLE with column names only
    for (const match of cleaned.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)\s*\(([\s\S]*?)\)\s*;/gi)) {
        const table = match[1];
        const cols = match[2]
            .split(',')
            .map((c) => c.trim().split(/\s+/)[0])
            .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|KEY|INDEX)/i.test(c))
            .slice(0, 24);
        add(`CREATE TABLE ${table} (${cols.join(', ')}, /* ... */);`);
    }

    for (const match of cleaned.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:VIEW|INDEX|UNIQUE\s+INDEX)\s+([\w."`[\]]+)/gi)) {
        add(`${match[0].split(/\s+/).slice(0, 4).join(' ')} ${match[1]}; -- skeleton`);
    }

    for (const match of cleaned.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:PROCEDURE|FUNCTION|TRIGGER)\s+([\w."`[\]]+)\s*(\([^)]*\))?/gi)) {
        add(`CREATE ${match[0].includes('TRIGGER') ? 'TRIGGER' : match[0].includes('FUNCTION') ? 'FUNCTION' : 'PROCEDURE'} ${match[1]}${match[2] ?? '()'}; -- body omitted`);
    }

    for (const match of cleaned.matchAll(/\bSELECT\b[\s\S]*?\bFROM\b\s+([\w."`[\]]+)/gi)) {
        const snippet = match[0]
            .replace(/\s+/g, ' ')
            .slice(0, 120);
        if (snippet.length > 20) {
            add(`${snippet} /* ... */;`);
        }
    }

    for (const match of cleaned.matchAll(/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\s+([\w."`[\]]+)/gi)) {
        add(`${match[1]} ${match[2]}; -- skeleton`);
    }

    if (output.length === 0) {
        const stmts = cleaned
            .split(';')
            .map((s) => s.trim().replace(/\s+/g, ' '))
            .filter((s) => s.length > 8)
            .slice(0, 15);
        for (const s of stmts) {
            add(s.slice(0, 100) + (s.length > 100 ? ' /* ... */' : '') + ';');
        }
    }

    const header = filePath ? `-- Oxygen Skeleton (SQL): ${filePath}\n` : '';
    return header + output.join('\n');
}

module.exports = { extractSqlSkeleton };
