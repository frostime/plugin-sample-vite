import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LIVE_RELOAD_PORT_START = 35740;
const LIVE_RELOAD_PORT_RANGE = 1000;

/**
 * Derive a stable development port from the plugin name so separate template
 * projects do not share the default LiveReload server.
 * @param {string} pluginName
 * @returns {number}
 */
export function deriveLiveReloadPort(pluginName) {
    let hash = 2166136261;

    for (const character of pluginName) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619) >>> 0;
    }

    return LIVE_RELOAD_PORT_START + (hash % LIVE_RELOAD_PORT_RANGE);
}

/**
 * Generate a development-only client that asks SiYuan to reload this plugin.
 * @param {{ port: number, pluginName: string, frontend: string, message: string, debounceMs: number, reloadGapMs: number }} options
 */
export function createSiYuanLiveReloadScript({ port, pluginName, frontend, message, debounceMs, reloadGapMs }) {
    const values = JSON.stringify({ frontend, message, pluginName, port, debounceMs, reloadGapMs });

    return `(function () {
    const options = ${values};
    const socketKey = "__siYuanPluginLiveReload";
    // Try both loopback names because localhost may resolve to IPv6 while the
    // LiveReload server is probed through IPv4 on Windows.
    const hosts = ["localhost", "127.0.0.1"];
    let hostIndex = 0;
    // Only reload after the server proves that it belongs to this plugin.
    let ownerVerified = false;
    let warnedUnverified = false;
    const previousSocket = globalThis[socketKey];
    previousSocket?.close?.();

    const showMessage = (text) => {
        try {
            if (typeof require === "function") {
                require("siyuan").showMessage(text);
            }
        } catch (error) {
            console.warn("Unable to show SiYuan live reload message", error);
        }
    };

    const request = async (enabled) => {
        const response = await fetch("/api/petal/setPetalEnabled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                packageName: options.pluginName,
                enabled,
                frontend: options.frontend
            })
        });
        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.msg || "SiYuan rejected the plugin reload request");
        }
    };

    let reloadTimer;
    let reloadInFlight = false;
    let reloadPending = false;

    const runReload = async () => {
        if (reloadInFlight) {
            reloadPending = true;
            return;
        }

        reloadInFlight = true;
        showMessage(options.message);
        try {
            await request(false);
            await new Promise((resolve) => setTimeout(resolve, options.reloadGapMs));
            await request(true);
        } catch (error) {
            console.error("SiYuan plugin live reload failed", error);
            showMessage("Live reload failed: " + (error?.message || error));
        } finally {
            reloadInFlight = false;
            if (reloadPending) {
                reloadPending = false;
                scheduleReload();
            }
        }
    };

    const scheduleReload = () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(runReload, options.debounceMs);
    };

    const connect = () => {
        const socket = new WebSocket("ws://" + hosts[hostIndex] + ":" + options.port + "/livereload");
        globalThis[socketKey] = socket;

        socket.addEventListener("open", () => {
            socket.send(JSON.stringify({
                command: "hello",
                protocols: ["http://livereload.com/protocols/official-7"],
                ver: "4.0.0"
            }));
        });

        socket.addEventListener("message", (event) => {
            const payload = JSON.parse(event.data);
            if (payload.command === "plugin-identity") {
                if (payload.plugin === options.pluginName) {
                    ownerVerified = true;
                } else {
                    console.warn("[live-reload] livereload server on port " + options.port + " belongs to plugin '" + payload.plugin + "', not '" + options.pluginName + "'. Disconnecting.");
                    socket.close();
                }
                return;
            }

            if (payload.command === "reload") {
                if (!ownerVerified) {
                    if (!warnedUnverified) {
                        warnedUnverified = true;
                        console.warn("[live-reload] Ignoring reload: livereload server on port " + options.port + " did not identify itself as '" + options.pluginName + "'.");
                    }
                    return;
                }
                scheduleReload();
            }
        });

        socket.addEventListener("error", () => {
            ownerVerified = false;
            hostIndex += 1;
            if (hostIndex < hosts.length) {
                setTimeout(connect, 200);
            } else {
                console.warn("SiYuan plugin live reload could not connect to port " + options.port + " (tried: " + hosts.join(", ") + ")");
            }
        });
    };

    connect();
})();`;
}

export function readPluginManifest() {
    return JSON.parse(readFileSync(resolve(import.meta.dirname, "../plugin.json"), "utf8"));
}
