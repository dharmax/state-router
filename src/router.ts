type RouteHandler = (...args: string[]) => void;

interface Route {
    pattern: RegExp | null;
    handler: RouteHandler;
}

export type RoutingMode = 'history' | 'hash';

class Router {
    private mode: RoutingMode = 'hash';
    private routes: Route[] = [];
    private root: string = '/';
    private baseLocation: string | null = null;
    public staticFilters:((url:string) => boolean)[] = []

    constructor() {
        this.staticFilters.push( url => {
            const staticFileExtensions = ['.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp','md'];
            return staticFileExtensions.some(ext => url.endsWith(ext));

        })
        window.addEventListener(this.mode === 'hash' ? 'hashchange' : 'popstate', this.listen.bind(this));
    }

    private clearSlashes(path: string): string {
        return path.replace(/\/$/, '').replace(/^\//, '');
    }

    private clearQuery(url: string): string {
        const [path, query] = url.split('?');
        if (!query) return path;
        const [_, hash] = query.split('#');
        return hash ? `${path}#${hash}` : path;
    }

    private isStaticFile(url: string): boolean {
        return (this.staticFilters || []).some(  filter => filter(url))
    }

    public resetRoot(root: string): void {
        this.root = '/' + this.clearSlashes(root) + '/';
    }

    public getLocation(): string {
        if (this.mode === 'history') {
            let fragment = this.clearSlashes(decodeURI(window.location.pathname + window.location.search));
            fragment = this.clearQuery(fragment);
            return this.root !== '/' ? fragment.replace(this.root, '') : fragment;
        } else {
            const match = window.location.href.match(/#(.*)$/);
            return match ? this.clearQuery(match[1]) : '';
        }
    }

    public add(pattern: RegExp | RouteHandler, handler?: RouteHandler): Router {
        if (typeof pattern === 'function') {
            handler = pattern;
            pattern = /^.*$/; // Match any path
        }
        this.routes.push({ pattern, handler: handler as RouteHandler });
        return this;
    }

    public process(location?: string): Router {
        const path = location || this.getLocation();
        if (this.isStaticFile(path))
            return this; // Bypass routing for static files


        for (const route of this.routes) {
            const match = path.match(route.pattern);
            if (match) {
                match.shift(); // Remove the full match element
                route.handler.apply({}, match);
                return this;
            }
        }

        console.warn(`No routing found for ${path}`);
        return this;
    }

    private listen(): void {
        const currentLocation = this.getLocation();
        if (this.baseLocation !== currentLocation) {
            this.baseLocation = currentLocation;
            this.process(currentLocation);
        }
    }

    public navigate(path: string = ''): Router {
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.clearSlashes(path));
        } else {
            window.location.hash = '#' + this.clearSlashes(path);
        }
        return this;
    }
}

export const router = new Router();
