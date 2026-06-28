'use strict';

const fs = require('fs');
const path = require('path');

/** @type {Record<string, { id: string, label: string, markers: string[] }>} */
const FRAMEWORK_RULES = {
    flutter: {
        id: 'flutter',
        label: 'Flutter',
        markers: ['pubspec.yaml'],
    },
    reactNative: {
        id: 'react-native',
        label: 'React Native',
        markers: ['metro.config.js', 'react-native.config.js', 'app.json'],
    },
    expo: {
        id: 'expo',
        label: 'Expo',
        markers: ['app.json', 'eas.json', 'app.config.js', 'app.config.ts'],
    },
    ionic: {
        id: 'ionic',
        label: 'Ionic',
        markers: ['ionic.config.json', 'capacitor.config.json'],
    },
    capacitor: {
        id: 'capacitor',
        label: 'Capacitor',
        markers: ['capacitor.config.json', 'capacitor.config.ts'],
    },
    nextjs: {
        id: 'nextjs',
        label: 'Next.js',
        markers: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
    },
    nuxt: {
        id: 'nuxt',
        label: 'Nuxt',
        markers: ['nuxt.config.ts', 'nuxt.config.js'],
    },
    angular: {
        id: 'angular',
        label: 'Angular',
        markers: ['angular.json'],
    },
    vue: {
        id: 'vue',
        label: 'Vue',
        markers: ['vue.config.js', 'vite.config.ts'],
    },
    androidNative: {
        id: 'android-native',
        label: 'Android Native',
        markers: ['AndroidManifest.xml', 'build.gradle'],
    },
    iosNative: {
        id: 'ios-native',
        label: 'iOS Native',
        markers: ['Podfile', 'Info.plist'],
    },
};

/**
 * @param {string} workspaceRoot
 */
function readPackageJson(workspaceRoot) {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * @param {Record<string, string> | undefined} deps
 * @param {string} name
 */
function hasDep(deps, name) {
    if (!deps) {
        return false;
    }
    return Object.keys(deps).some((k) => k === name || k.startsWith(`${name}/`));
}

/**
 * Detect primary mobile / cross-platform framework from project markers.
 * @param {string} workspaceRoot
 */
function detectFramework(workspaceRoot) {
    if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
        return { id: 'unknown', label: 'Generic', markers: [] };
    }

    /** @type {string[]} */
    const matched = [];
    let primary = null;

    const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
        try {
            const pubspec = fs.readFileSync(pubspecPath, 'utf8');
            if (/flutter:\s*$/m.test(pubspec) || /sdk:\s*flutter/i.test(pubspec)) {
                primary = FRAMEWORK_RULES.flutter;
                matched.push('pubspec.yaml (Flutter SDK)');
            }
        } catch {
            // ignore
        }
    }

    const pkg = readPackageJson(workspaceRoot);
    if (pkg) {
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
        if (hasDep(deps, 'expo') || hasDep(deps, '@expo/metro-config')) {
            primary = primary ?? FRAMEWORK_RULES.expo;
            matched.push('package.json (expo)');
        }
        if (hasDep(deps, 'react-native')) {
            primary = primary ?? FRAMEWORK_RULES.reactNative;
            matched.push('package.json (react-native)');
        }
        if (hasDep(deps, '@ionic/angular') || hasDep(deps, '@ionic/react') || hasDep(deps, '@ionic/vue')) {
            primary = primary ?? FRAMEWORK_RULES.ionic;
            matched.push('package.json (@ionic/*)');
        }
        if (hasDep(deps, '@capacitor/core')) {
            primary = primary ?? FRAMEWORK_RULES.capacitor;
            matched.push('package.json (@capacitor/core)');
        }
        if (hasDep(deps, 'next')) {
            primary = primary ?? FRAMEWORK_RULES.nextjs;
            matched.push('package.json (next)');
        }
        if (hasDep(deps, 'nuxt') || hasDep(deps, 'nuxt3')) {
            primary = primary ?? FRAMEWORK_RULES.nuxt;
            matched.push('package.json (nuxt)');
        }
        if (hasDep(deps, '@angular/core')) {
            primary = primary ?? FRAMEWORK_RULES.angular;
            matched.push('package.json (@angular/core)');
        }
        if (hasDep(deps, 'vue')) {
            primary = primary ?? FRAMEWORK_RULES.vue;
            matched.push('package.json (vue)');
        }
    }

    for (const rule of Object.values(FRAMEWORK_RULES)) {
        for (const marker of rule.markers) {
            if (fs.existsSync(path.join(workspaceRoot, marker)) && !matched.includes(marker)) {
                matched.push(marker);
                if (!primary) {
                    primary = rule;
                }
            }
        }
    }

    if (primary) {
        return {
            id: primary.id,
            label: primary.label,
            markers: matched,
        };
    }

    return { id: 'unknown', label: 'Generic', markers: matched };
}

/**
 * @param {string} workspaceRoot
 * @param {{ id: string, label: string, markers: string[] }} framework
 */
function writeFrameworkInfo(workspaceRoot, framework) {
    const dir = path.join(workspaceRoot, '.oxygen');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'framework.json'), JSON.stringify({
        updatedAt: new Date().toISOString(),
        ...framework,
    }, null, 2), 'utf8');
}

module.exports = {
    FRAMEWORK_RULES,
    detectFramework,
    writeFrameworkInfo,
};
