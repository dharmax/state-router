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
    public staticFilters: ((url: string) => boolean)[] = []

    constructor() {
        this.staticFilters.push(url => {
            const staticFileExtensions = ['.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp', '.md', '.ejs', '.jsm', '.txt'];
            return staticFileExtensions.some(ext => url.endsWith(ext));

        })
    }

    private cleanPathString(path: string): string {
        path = path.replace(/\/$/, '').replace(/^\//, '');
        return path = path.replace(/#{2,}/g, '#');
    }

    private clearQuery(url: string): string {
        const [path, query] = url.split('?');
        if (!query) return path;
        const [_, hash] = query.split('#');
        return hash ? `${path}#${hash}` : path;
    }

    private isStaticFile(url: string): boolean {
        return (this.staticFilters || []).some(filter => filter(url))
    }

    public resetRoot(root: string): void {
        this.root = '/' + this.cleanPathString(root) + '/';
    }

    public getLocation(): string {
        if (this.mode === 'history') {
            let fragment = this.cleanPathString(decodeURI(window.location.pathname + window.location.search));
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
        this.routes.push({pattern, handler: handler as RouteHandler});
        return this;
    }

    public handleChange(location?: string): Router {
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

    listen(mode: RoutingMode = 'hash'): void {
        const self = this
        this.mode = mode
        switch (mode) {
            case "hash":
                window.addEventListener('hashchange', () => handler())
                break
            case "history":
                window.addEventListener('popstate', event => handler(event.state?.path));
                document.addEventListener('click', handleInternalNavigation);
                document.addEventListener('keydown', event => {
                    // @ts-ignore
                    if (event.key === 'Enter' && event.target.tagName === 'A')
                        handleInternalNavigation(event);
                });
        }

        function handleInternalNavigation(event: any) {
            const node = event.target
            const href = node.getAttribute('href')
            if (href) {
                event.preventDefault();
                history.pushState({path: href}, '', href);
                handler(href);
            }
        }

        function handler(path?: string) {
            path = path || location.href.split('#')[0]

            if (self.isStaticFile(path))
                return
            const currentLocation = self.getLocation();
            if (self.baseLocation !== currentLocation) {
                self.baseLocation = currentLocation;
                self.handleChange(currentLocation);
            }
        }

        handler()
    }


    navigate(path: string = ''): Router {
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.cleanPathString(path));
        } else {
            window.location.hash = '#' + this.cleanPathString(path);
        }
        return this;
    }
}

export const router = new Router();
