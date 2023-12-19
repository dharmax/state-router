type RouteHandler = (...args: string[]) => void;
export type RoutingMode = 'history' | 'hash';
declare class Router {
    private mode;
    private routes;
    private root;
    private baseLocation;
    staticFilters: ((url: string) => boolean)[];
    constructor();
    private cleanPathString;
    private clearQuery;
    private isStaticFile;
    resetRoot(root: string): void;
    getLocation(): string;
    add(pattern: RegExp | RouteHandler, handler?: RouteHandler): Router;
    handleChange(location?: string): Router;
    listen(mode?: RoutingMode): void;
    navigate(path?: string): Router;
}
export declare const router: Router;
export {};
