'use strict';

const path = require('path');
const { detectLanguageGroup } = require('./language');
const { extractGenericSkeleton } = require('./extractors/generic');
const { extractCLikeSkeleton } = require('./extractors/cLike');
const { extractJavaScriptSkeleton } = require('./extractors/javascript');
const { extractCppSkeleton } = require('./extractors/cpp');
const { extractHtmlSkeleton } = require('./extractors/html');
const { extractPythonSkeleton } = require('./extractors/python');
const {
    extractPhpSkeleton,
    extractRubySkeleton,
    extractMarkupSkeleton,
    extractLuaSkeleton,
    extractShellSkeleton,
} = require('./extractors/misc');
const { extractGoSkeleton } = require('./extractors/go');
const { extractRustSkeleton } = require('./extractors/rust');
const { extractSqlSkeleton } = require('./extractors/sql');
const { extractDartSkeleton } = require('./extractors/dart');
const { extractSwiftSkeleton } = require('./extractors/swift');
const { extractKotlinSkeleton } = require('./extractors/kotlin');
const { extractObjcSkeleton } = require('./extractors/objc');
const { extractJavaSkeleton } = require('./extractors/java');
const { extractGradleSkeleton } = require('./extractors/gradle');
const { extractYamlSkeleton } = require('./extractors/yaml');
const { extractXmlMobileSkeleton } = require('./extractors/xmlMobile');
const { extractJsonSkeleton } = require('./extractors/json');
const { extractElixirSkeleton } = require('./extractors/elixir');
const { extractHaskellSkeleton } = require('./extractors/haskell');

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSkeleton(source, filePath) {
    const group = detectLanguageGroup(filePath);

    switch (group) {
        case 'cLike':
            return extractCLikeSkeleton(source, filePath);
        case 'javascript':
            return extractJavaScriptSkeleton(source, filePath);
        case 'cpp':
            return extractCppSkeleton(source, filePath);
        case 'html':
            return extractHtmlSkeleton(source, filePath);
        case 'python':
            return extractPythonSkeleton(source, filePath);
        case 'php':
            return extractPhpSkeleton(source, filePath);
        case 'ruby':
            return extractRubySkeleton(source, filePath);
        case 'markup':
            return extractMarkupSkeleton(source, filePath);
        case 'go':
            return extractGoSkeleton(source, filePath);
        case 'rust':
            return extractRustSkeleton(source, filePath);
        case 'sql':
            return extractSqlSkeleton(source, filePath);
        case 'dart':
            return extractDartSkeleton(source, filePath);
        case 'swift':
            return extractSwiftSkeleton(source, filePath);
        case 'kotlin':
            return extractKotlinSkeleton(source, filePath);
        case 'objc':
            return extractObjcSkeleton(source, filePath);
        case 'java':
            return extractJavaSkeleton(source, filePath);
        case 'gradle':
            return extractGradleSkeleton(source, filePath);
        case 'yaml':
            return extractYamlSkeleton(source, filePath);
        case 'xmlMobile':
            return extractXmlMobileSkeleton(source, filePath);
        case 'json':
            return extractJsonSkeleton(source, filePath);
        case 'elixir':
            return extractElixirSkeleton(source, filePath);
        case 'haskell':
            return extractHaskellSkeleton(source, filePath);
        case 'lua':
            return extractLuaSkeleton(source, filePath);
        case 'shell':
            return extractShellSkeleton(source, filePath);
        default:
            return extractGenericSkeleton(source, filePath);
    }
}

/**
 * @param {string} source
 * @param {string} [filePath]
 */
function extractSkeletonWithMeta(source, filePath) {
    const skeleton = extractSkeleton(source, filePath);
    const originalChars = source?.length ?? 0;
    const skeletonChars = skeleton.length;
    const ratio = originalChars > 0 ? skeletonChars / originalChars : 0;

    return {
        skeleton,
        originalChars,
        skeletonChars,
        compressionRatio: ratio,
        languageGroup: detectLanguageGroup(filePath),
        filePath: filePath ? path.basename(filePath) : 'unknown',
    };
}

module.exports = { extractSkeleton, extractSkeletonWithMeta };
