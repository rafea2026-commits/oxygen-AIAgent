'use strict';

/**
 * XML skeleton — Android layouts, manifests, iOS plist-like structures.
 * @param {string} source
 * @param {string} [filePath]
 */
function extractXmlMobileSkeleton(source, filePath) {
    if (!source) {
        return '';
    }

    const output = [];
    const isManifest = /AndroidManifest|<manifest\b/i.test(source);
    const isLayout = /<(?:Linear|Relative|Constraint|Frame|Scroll|NestedScroll|Compose|androidx\.)/i.test(source);

    if (isManifest) {
        const pkg = source.match(/package="([^"]+)"/)?.[1];
        if (pkg) {
            output.push(`<!-- package: ${pkg} -->`);
        }
        for (const m of source.matchAll(/<uses-permission[^>]+android:name="([^"]+)"/g)) {
            output.push(`<uses-permission android:name="${m[1]}" />`);
        }
        for (const m of source.matchAll(/<activity[^>]+android:name="([^"]+)"/g)) {
            output.push(`<activity android:name="${m[1]}" ... />`);
        }
        for (const m of source.matchAll(/<service[^>]+android:name="([^"]+)"/g)) {
            output.push(`<service android:name="${m[1]}" ... />`);
        }
        for (const m of source.matchAll(/<receiver[^>]+android:name="([^"]+)"/g)) {
            output.push(`<receiver android:name="${m[1]}" ... />`);
        }
    } else if (isLayout) {
        const root = source.match(/<([\w.]+)[^>]*>/)?.[1];
        if (root) {
            output.push(`<${root} ...>`);
        }
        const ids = [...source.matchAll(/android:id="@\+?id\/([\w.]+)"/g)].map((m) => m[1]);
        const uniqueIds = [...new Set(ids)].slice(0, 30);
        for (const id of uniqueIds) {
            output.push(`  <!-- @id/${id} -->`);
        }
        for (const m of source.matchAll(/<([\w.]+)[^>]*android:id="@\+?id\/([\w.]+)"/g)) {
            if (output.length < 45) {
                output.push(`<${m[1]} android:id="@+id/${m[2]}" ... />`);
            }
        }
    } else {
        // Generic XML: opening tags with attributes (compact)
        const tags = source.match(/<[a-zA-Z][\w.:.-]*(?:\s+[\w.:.-]+(?:="[^"]*")?)*\s*\/?>/g) || [];
        const unique = [...new Set(tags)].slice(0, 40);
        output.push(...unique);
    }

    const header = filePath ? `<!-- Oxygen Skeleton (XML): ${filePath} -->\n` : '';
    return header + output.join('\n');
}

module.exports = { extractXmlMobileSkeleton };
