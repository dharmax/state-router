type RouteHandler = (...args: string[]) => void;
export type RoutingMode = 'history' | 'hash';
export declare class Router {
    #private;
    staticFilters: ((url: string) => boolean)[];
    constructor();
    resetRoot(root: string): void;
    setMode(mode: RoutingMode): void;
    getLocation(): string;
    add(pattern: RegExp | string | RouteHandler, handler?: RouteHandler): Router;
    onNotFound(handler: (path: string) => void): Router;
    setDecodeParams(decode: boolean): Router;
    willHandle(path: string): boolean;
    getQueryParams(search?: string): Record<string, string>;
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
