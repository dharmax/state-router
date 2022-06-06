declare class Route {
    constructor();
    re: RegExp;
    handler: Function;
}
export declare type RoutingMode = 'history' | 'hash';
export declare const router: {
    mode: RoutingMode;
    routes: Route[];
    root: string;
    baseLocation: string | null;
    resetRoot(root: string): void;
    getLocation(): string;
    clearSlashes(path: string): string;
    clearQuery(url: string): string;
    add(re: Function | RegExp, handler: Function): any;
    process(location?: string): any;
    listen(): any;
    navigate(path?: string): any;
};
export {};
