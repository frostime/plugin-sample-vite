declare module "livereload" {
    interface LiveReloadWebSocketServer {
        on(event: "connection", listener: (socket: { send(data: string): void }) => void): LiveReloadWebSocketServer;
    }

    interface LiveReloadServer {
        server: LiveReloadWebSocketServer;
        watch(paths: string | string[]): void;
        close(): void;
        on(event: "error", listener: (error: Error) => void): LiveReloadServer;
    }

    export function createServer(options?: {
        port?: number;
        delay?: number;
        host?: string;
    }): LiveReloadServer;
}
