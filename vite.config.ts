import { existsSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { createServer as createLiveReloadServer } from "livereload";
import zipPack from "vite-plugin-zip-pack";
import fg from "fast-glob";

import vitePluginYamlI18n from "./yaml-plugin.js";
import { createSiYuanLiveReloadScript, readPluginManifest } from "./scripts/siyuan_live_reload.js";

const env = process.env;
const isSrcmap = env.VITE_SOURCEMAP === "inline";
const isDev = env.NODE_ENV === "development";
const outputDir = isDev ? "dev" : "dist";
const pluginManifest = readPluginManifest();

const packageImageTargets = [
    ["icon", "icon.png"],
    ["preview", "preview.png"],
].flatMap(([field, legacyName]) => {
    const manifestFileName = pluginManifest[field];
    const fileName = manifestFileName || (existsSync(legacyName) ? legacyName : "");
    return fileName ? [{ src: `./${fileName}`, dest: "./" }] : [];
});

const liveReloadPort = Number.parseInt(env.SIYUAN_LIVERELOAD_PORT || "35740", 10);
const liveReloadFrontend = env.SIYUAN_LIVERELOAD_FRONTEND || "desktop";
const liveReloadMessage = env.SIYUAN_LIVERELOAD_MESSAGE || `Live reload: ${pluginManifest.name}`;
const liveReloadDebounceMs = Number.parseInt(env.SIYUAN_LIVERELOAD_DEBOUNCE_MS || "300", 10);
const pluginReloadGapMs = Number.parseInt(env.SIYUAN_PLUGIN_RELOAD_GAP_MS || "500", 10);

console.log("isDev=>", isDev);
console.log("isSrcmap=>", isSrcmap);
console.log("outputDir=>", outputDir);

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "src"),
        }
    },

    plugins: [
        vitePluginYamlI18n({
            inDir: "public/i18n",
            outDir: `${outputDir}/i18n`
        }),

        viteStaticCopy({
            targets: [
                ...packageImageTargets,
                { src: "./README*.md", dest: "./" },
                { src: "./asset/*", dest: "./asset", rename: { stripBase: true } },
                { src: "./plugin.json", dest: "./" },
            ],
        }),
    ],

    define: {
        "process.env.DEV_MODE": JSON.stringify(isDev),
        "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
    },

    build: {
        outDir: outputDir,
        emptyOutDir: false,
        minify: true,
        sourcemap: isSrcmap ? "inline" : false,

        lib: {
            entry: resolve(import.meta.dirname, "src/index.ts"),
            fileName: () => "index.js",
            cssFileName: "index",
            formats: ["cjs"],
        },
        rollupOptions: {
            plugins: isDev ? [
                liveReloadServer(),
                siYuanPluginReload(),
                watchExternalFiles([
                    "public/i18n/**",
                    "./README*.md",
                    "./plugin.json",
                    "./asset/**"
                ])
            ] : [
                cleanupDistFiles({
                    patterns: ["i18n/*.yaml", "i18n/*.md"],
                    distDir: outputDir
                }),
                zipPack({
                    inDir: "./dist",
                    outDir: "./",
                    outFileName: "package.zip"
                })
            ],

            external: ["siyuan", "process"],

            output: {
                entryFileNames: "[name].js",
                assetFileNames: (assetInfo) => assetInfo.name ?? "asset",
            },
        },
    }
});

let liveReloadActive = false;

/**
 * Probe the exact address the live reload server will bind (IPv4 loopback,
 * same as the client's ws://127.0.0.1 target) so a busy port degrades the
 * build to "no live reload" instead of crashing it — e.g. another plugin
 * project's dev session already holds the default port. Binding `::` would
 * succeed even when 127.0.0.1 is taken on Windows, hiding the conflict.
 */
function isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const probe = createNetServer();
        probe.once("error", () => resolve(false));
        probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
}

function liveReloadServer(): Plugin {
    let server: ReturnType<typeof createLiveReloadServer> | undefined;

    return {
        name: "siyuan-live-reload-server",
        async buildStart() {
            if (server) {
                return;
            }

            if (!(await isPortFree(liveReloadPort))) {
                console.warn(
                    `[live-reload] port ${liveReloadPort} is already in use, building without live reload. ` +
                    "Set SIYUAN_LIVERELOAD_PORT to a free port if you need it."
                );
                liveReloadActive = false;
                return;
            }

            // livereload@0.9 ignores a host option and binds all interfaces;
            // reachability is governed by the probe above and the client's
            // ws://127.0.0.1 target.
            server = createLiveReloadServer({
                port: liveReloadPort,
                delay: liveReloadDebounceMs
            });
            server.on("error", (error) => {
                console.error(`[live-reload] server error, live reload disabled:`, error);
                server = undefined;
                liveReloadActive = false;
            });
            server.watch(resolve(import.meta.dirname, outputDir));
            liveReloadActive = true;
        },
        closeWatcher() {
            server?.close();
            server = undefined;
            liveReloadActive = false;
        }
    };
}

function siYuanPluginReload(): Plugin {
    return {
        name: "siyuan-plugin-reload",
        // Skip the client script when no server is running, so the plugin does
        // not try to connect to a dead port on every page load.
        banner: () => liveReloadActive ? createSiYuanLiveReloadScript({
            port: liveReloadPort,
            pluginName: pluginManifest.name,
            frontend: liveReloadFrontend,
            message: liveReloadMessage,
            debounceMs: liveReloadDebounceMs,
            reloadGapMs: pluginReloadGapMs
        }) : ""
    };
}

function watchExternalFiles(patterns: string[]): Plugin {
    return {
        name: "watch-external",
        async buildStart() {
            const files = await fg(patterns);
            for (const file of files) {
                this.addWatchFile(file);
            }
        }
    };
}

/**
 * Remove generated files that are not part of the installable plugin package.
 */
function cleanupDistFiles(options: { patterns: string[], distDir: string }): Plugin {
    const {
        patterns,
        distDir
    } = options;

    return {
        name: "rollup-plugin-cleanup",
        enforce: "post",
        writeBundle: {
            sequential: true,
            order: "post" as "post",
            async handler() {
                const fg = await import("fast-glob");
                const fs = await import("fs");
                const distPatterns = patterns.map(pattern => `${distDir}/${pattern}`);
                console.debug("Cleanup searching patterns:", distPatterns);

                const files = await fg.default(distPatterns, {
                    dot: true,
                    absolute: true,
                    onlyFiles: false
                });

                for (const file of files) {
                    try {
                        if (fs.default.existsSync(file)) {
                            const stat = fs.default.statSync(file);
                            if (stat.isDirectory()) {
                                fs.default.rmSync(file, { recursive: true });
                            } else {
                                fs.default.unlinkSync(file);
                            }
                            console.log(`Cleaned up: ${file}`);
                        }
                    } catch (error) {
                        console.error(`Failed to clean up ${file}:`, error);
                    }
                }
            }
        }
    };
}
