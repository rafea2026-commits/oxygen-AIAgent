'use strict';

const fs = require('fs');
const path = require('path');

/** Globs passed to vscode.workspace.findFiles exclude. */
const INDEX_EXCLUDE_GLOB = '**/{node_modules,.git,build,dist,out,.oxygen,.dart_tool,.expo,.next,.nuxt,.angular,coverage,.turbo,.gradle,DerivedData,ios/Pods,ios/build,android/.gradle,android/app/build,android/build,.idea,.vscode-test}/**';

/** Path patterns skipped during indexing. */
const SKIP_PATH_RE = /node_modules|[/\\]\.git[/\\]|[/\\](build|dist|out)[/\\]|[/\\]\.oxygen[/\\]|[/\\]\.dart_tool[/\\]|[/\\]\.expo[/\\]|[/\\]\.next[/\\]|[/\\]\.nuxt[/\\]|[/\\]ios[/\\]Pods[/\\]|[/\\]ios[/\\]DerivedData[/\\]|[/\\]android[/\\]\.gradle[/\\]|[/\\]android[/\\]app[/\\]build[/\\]|[/\\]coverage[/\\]/;

/** Generated / lock files — low value for Agent context. */
const SKIP_BASENAME_RE = /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|pubspec\.lock|Podfile\.lock|Gemfile\.lock|composer\.lock|Cargo\.lock|go\.sum)$/i;

const SKIP_EXT_RE = /\.(lock|min\.js|min\.css|map|snap|pbxproj|xcworkspace|xcuserstate|keystore|jks|png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot|mp4|mp3|pdf|zip|aar|apk|ipa|dex|class)$/i;

/** Generated Flutter / RN artifacts. */
const SKIP_GENERATED_RE = /\.(g\.dart|freezed\.dart|gr\.dart|mocks\.dart|config\.dart|pb\.dart|pbjson\.dart|pbenum\.dart)$/i;

const SOURCE_EXT = new Set([
    '.dart', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte',
    '.kt', '.kts', '.java', '.swift', '.m', '.mm',
    '.py', '.pyw', '.go', '.rs', '.php', '.rb', '.erb', '.cs',
    '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.scala', '.groovy',
    '.ex', '.exs', '.hs', '.lua', '.sql',
    '.yaml', '.yml', '.toml', '.json', '.jsonc', '.xml', '.gradle',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
    '.arb', '.xcconfig', '.plist', '.storyboard', '.xib', '.pro',
    '.wxml', '.wxss',
]);

/** Framework & build config files (basename → language group). */
const FRAMEWORK_BASENAME_TO_GROUP = {
    // Flutter
    'pubspec.yaml': 'yaml',
    'analysis_options.yaml': 'yaml',
    'l10n.yaml': 'yaml',
    'flutter_native_splash.yaml': 'yaml',

    // React Native / Expo
    'app.json': 'json',
    'app.config.js': 'javascript',
    'app.config.ts': 'cLike',
    'app.config.mjs': 'javascript',
    'metro.config.js': 'javascript',
    'metro.config.ts': 'cLike',
    'react-native.config.js': 'javascript',
    'babel.config.js': 'javascript',
    'eas.json': 'json',
    'expo-module.config.json': 'json',

    // Ionic / Capacitor / Cordova
    'capacitor.config.json': 'json',
    'capacitor.config.ts': 'cLike',
    'ionic.config.json': 'json',
    'config.xml': 'xmlMobile',

    // Web frameworks
    'next.config.js': 'javascript',
    'next.config.mjs': 'javascript',
    'next.config.ts': 'cLike',
    'nuxt.config.ts': 'cLike',
    'nuxt.config.js': 'javascript',
    'angular.json': 'json',
    'vite.config.ts': 'cLike',
    'vite.config.js': 'javascript',
    'webpack.config.js': 'javascript',
    'svelte.config.js': 'javascript',
    'vue.config.js': 'javascript',
    'remix.config.js': 'javascript',
    'tailwind.config.js': 'javascript',
    'tailwind.config.ts': 'cLike',
    'astro.config.mjs': 'javascript',

    // Android / Gradle
    'build.gradle': 'gradle',
    'settings.gradle': 'gradle',
    'gradle.properties': 'yaml',
    'AndroidManifest.xml': 'xmlMobile',
    'proguard-rules.pro': 'generic',

    // iOS / Apple
    'Podfile': 'ruby',
    'Gemfile': 'ruby',
    'Fastfile': 'ruby',
    'Appfile': 'ruby',
    'Info.plist': 'xmlMobile',
    'GoogleService-Info.plist': 'xmlMobile',
    'Package.swift': 'swift',

    // Firebase / services
    'firebase.json': 'json',
    'google-services.json': 'json',

    // Native / infra
    'CMakeLists.txt': 'generic',
    'Makefile': 'shell',
    'Dockerfile': 'generic',
    'Procfile': 'generic',
};

/**
 * @param {string} fsPath
 */
function isIndexableFile(fsPath) {
    const base = path.basename(fsPath);
    const baseLower = base.toLowerCase();
    const ext = path.extname(fsPath).toLowerCase();

    if (SKIP_PATH_RE.test(fsPath)) {
        return false;
    }
    if (SKIP_BASENAME_RE.test(base)) {
        return false;
    }
    if (SKIP_EXT_RE.test(fsPath) || SKIP_GENERATED_RE.test(fsPath)) {
        return false;
    }
    if (FRAMEWORK_BASENAME_TO_GROUP[base] || FRAMEWORK_BASENAME_TO_GROUP[baseLower]) {
        return true;
    }
    if (baseLower.endsWith('.gradle.kts') || baseLower.endsWith('.gradle')) {
        return true;
    }
    return SOURCE_EXT.has(ext);
}

module.exports = {
    INDEX_EXCLUDE_GLOB,
    SOURCE_EXT,
    FRAMEWORK_BASENAME_TO_GROUP,
    isIndexableFile,
};
