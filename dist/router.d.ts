type RouteHandler = (...args: string[]) => void;
export type RoutingMode = 'history' | 'hash';
export declare class Router {
    private mode;
    private routes;
    private root;
    private rootCompare;
    private baseLocation;
    staticFilters: ((url: string) => boolean)[];
    private isListening;
    private bound;
    private notFoundHandler?;
    private decodeParams;
    constructor();
    private cleanPathString;
    private clearQuery;
    private isStaticFile;
    resetRoot(root: string): void;
    getLocation(): string;
    add(pattern: RegExp | string | RouteHandler, handler?: RouteHandler): Router;
    onNotFound(handler: (path: string) => void): Router;
    setDecodeParams(decode: boolean): Router;
    getQueryParams(search?: string): Record<string, string>;
    private isBrowser;
    private compilePattern;
    /**
     *
     * @param location
     * @return true if it was intercepted or false if not handled
     */
    handleChange(location?: string): boolean;
    listen(mode?: RoutingMode): void;
    unlisten(): void;
    navigate(path?: string, opts?: {
        replace?: boolean;
    }): boolean;
    replace(path?: string): boolean;
}
export declare const router: Router;
export declare function createRouter(): Router;
export {};
