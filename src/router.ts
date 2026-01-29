type RouteHandler = (...args: string[]) => void;

interface Route {
    pattern: RegExp | null;
    handler: RouteHandler;
    paramNames?: string[];
}

export type RoutingMode = 'history' | 'hash';

export class Router {
    #mode: RoutingMode = 'hash';
    #routes: Route[] = [];
    #root: string = '/';
    #rootCompare: string = '';
    #baseLocation: string | null = null;
    public staticFilters: ((url: string) => boolean)[] = []

    #isListening = false;
    #bound: {
        hashchange?: () => void,
        popstate?: (e: PopStateEvent) => void,
        click?: (e: Event) => void,
        keydown?: (e: KeyboardEvent) => void,
    } = {};

    #notFoundHandler?: (path: string) => void;
    #decodeParams = false;

    constructor() {
        this.staticFilters.push(url => {
            const staticFileExtensions = ['.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp', '.md', '.ejs', '.jsm', '.txt'];
            return staticFileExtensions.some(ext => url.endsWith(ext));
        });
    }

    #cleanPathString(path: string): string {
        path = path.replace(/\/$/, '').replace(/^\//, '');
        return path = path.replace(/#{2,}/g, '#');
    }

    #clearQuery(url: string): string {
        const [path, query] = url.split('?');
        if (!query) return path;
        const [_, hash] = query.split('#');
        return hash ? `${path}#${hash}` : path;
    }

    #isStaticFile(url: string): boolean {
        return this.staticFilters.some(filter => filter(url))
    }

    public resetRoot(root: string): void {
        const cleaned = this.#cleanPathString(root)
        this.#root = '/' + cleaned + '/';
        this.#rootCompare = cleaned ? cleaned + '/' : ''
    }

    public setMode(mode: RoutingMode): void {
        this.#mode = mode;
    }

    public getLocation(): string {
        if (!this.#isBrowser()) return '';
        if (this.#mode === 'history') {
            let fragment = decodeURI(window.location.pathname + window.location.search);
            fragment = this.#clearQuery(fragment);
            // strip leading slash for comparison convenience
            fragment = fragment.replace(/^\//, '');
            if (this.#root !== '/' && this.#rootCompare && fragment.startsWith(this.#rootCompare)) {
                fragment = fragment.slice(this.#rootCompare.length);
            }
            fragment = this.#cleanPathString(fragment);
            return fragment;
        } else {
            const match = window.location.href.match(/#(.*)$/);
            return match ? this.#clearQuery(match[1]) : '';
        }
    }

    public add(pattern: RegExp | string | RouteHandler, handler?: RouteHandler): Router {
        let paramNames: string[] | undefined;
        if (typeof pattern === 'function') {
            handler = pattern;
            pattern = /^.*$/; // Match any path
        } else if (typeof pattern === 'string') {
            const compiled = this.#compilePattern(pattern);
            pattern = compiled.regex;
            paramNames = compiled.paramNames;
        }
        this.#routes.push({ pattern: pattern as RegExp, handler: handler as RouteHandler, paramNames });
        return this;
    }

    public onNotFound(handler: (path: string) => void): Router {
        this.#notFoundHandler = handler;
        return this;
    }

    public setDecodeParams(decode: boolean): Router {
        this.#decodeParams = decode;
        return this;
    }

    public getQueryParams(search?: string): Record<string, string> {
        if (!this.#isBrowser() && !search) return {};
        const qs = typeof search === 'string' ? search : window.location.search || '';
        const usp = new URLSearchParams(qs);
        const obj: Record<string, string> = {};
        usp.forEach((v, k) => { obj[k] = v; });
        return obj;
    }

    #isBrowser(): boolean {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }

    #compilePattern(pattern: string): { regex: RegExp, paramNames: string[] } {
        // normalize leading slash to align with cleanPathString behavior
        const normalized = pattern.replace(/^\//, '');
        const paramNames: string[] = [];
        // convert /users/:id -> ^users/([^/]+)$
        const reStr = normalized
            .replace(/([.*+?^${}()|[\]\\])/g, '\\$1') // escape regex specials
            .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, p1) => {
                paramNames.push(p1);
                return '([^/]+)';
            });
        return { regex: new RegExp(`^${reStr}$`), paramNames };
    }

    /**
     *
     * @param location
     * @return true if it was intercepted or false if not handled
     */
    public handleChange(location?: string): boolean {
        const path = (location ?? this.getLocation()) || '';
        if (this.#isStaticFile(path))
            return false; // Bypass routing for static files

        for (const route of this.#routes) {
            const match = route.pattern ? path.match(route.pattern) : null;
            if (match) {
                match.shift(); // Remove the full match element
                const queryParams = this.getQueryParams();
                const captures = this.#decodeParams ? match.map(v => safeDecode(v)) : match;
                let params: Record<string, string> | undefined;
                if (route.paramNames && route.paramNames.length) {
                    params = {};
                    route.paramNames.forEach((n, i) => params![n] = captures[i]);
                }
                route.handler.call({ queryParams, params }, ...captures);
                return true
            }
        }

        if (this.#notFoundHandler) {
            this.#notFoundHandler(path);
            return true;
        }

        if (path) console.warn(`No routing found for ${path}`);
        return false
    }

    listen(mode: RoutingMode = 'hash'): void {
        if (!this.#isBrowser()) return;
        // avoid duplicate listeners
        if (this.#isListening) this.unlisten();

        const self = this
        this.#mode = mode

        const handler = (path?: string) => {
            const p = path || location.href.split('#')[0]
            if (self.#isStaticFile(p)) return
            const currentLocation = self.getLocation();
            if (self.#baseLocation !== currentLocation) {
                self.#baseLocation = currentLocation;
                self.handleChange(currentLocation);
            }
        }

        const handleInternalNavigation = (event: Event) => {
            // modified clicks or non-left clicks
            const me = event as MouseEvent
            if (event.type === 'click') {
                if (me.button !== 0) return; // left-click only
                if (me.metaKey || me.ctrlKey || me.shiftKey) return;
            }

            const target = event.target as Element | null
            if (!target) return;
            const anchor = target.closest('a');
            if (!anchor) return

            if (event.type === 'keydown') {
                const ke = event as KeyboardEvent
                if (ke.key !== 'Enter') return
            }

            const href = anchor.getAttribute('href') || ''
            if (!href) return

            const url = new URL(href, window.location.href)

            // ignore external origins or different hostnames
            if (url.origin !== window.location.origin) return

            // ignore target=_blank, download, or rel=noreferrer
            const t = anchor.getAttribute('target')
            if (t && t.toLowerCase() === '_blank') return
            if (anchor.hasAttribute('download')) return
            const rel = anchor.getAttribute('rel')
            if (rel && /\bnoreferrer\b/i.test(rel)) return

            const pathWithQuery = url.pathname + (url.search || '')
            if (self.#isStaticFile(pathWithQuery) || self.#isStaticFile(url.pathname)) return

            event.preventDefault()
            history.pushState({ path: pathWithQuery }, '', pathWithQuery)
            handler(pathWithQuery)
        }

        switch (mode) {
            case 'hash':
                this.#bound.hashchange = () => handler()
                window.addEventListener('hashchange', this.#bound.hashchange)
                break
            case 'history':
                this.#bound.popstate = (event: PopStateEvent) => handler(this.getLocation())
                this.#bound.click = handleInternalNavigation
                this.#bound.keydown = (event: KeyboardEvent) => handleInternalNavigation(event)
                window.addEventListener('popstate', this.#bound.popstate)
                document.addEventListener('click', this.#bound.click)
                document.addEventListener('keydown', this.#bound.keydown)
                break
        }

        this.#isListening = true
        handler()
    }

    unlisten(): void {
        if (!this.#isBrowser() || !this.#isListening) return;
        switch (this.#mode) {
            case 'hash':
                if (this.#bound.hashchange) window.removeEventListener('hashchange', this.#bound.hashchange)
                break
            case 'history':
                if (this.#bound.popstate) window.removeEventListener('popstate', this.#bound.popstate)
                if (this.#bound.click) document.removeEventListener('click', this.#bound.click)
                if (this.#bound.keydown) document.removeEventListener('keydown', this.#bound.keydown)
                break
        }
        this.#bound = {}
        this.#isListening = false
    }


    navigate(path: string = '', opts?: { replace?: boolean }): boolean {
        if (!this.#isBrowser()) return false;
        if (this.#mode === 'history') {
            const url = this.#root + this.#cleanPathString(path)
            if (opts?.replace) history.replaceState(null, '', url)
            else history.pushState(null, '', url)
        } else
            window.location.hash = this.#cleanPathString(path);
        return this.handleChange()
    }

    replace(path: string = ''): boolean {
        return this.navigate(path, { replace: true })
    }
}

export const router = new Router();
export function createRouter(): Router { return new Router() }

function safeDecode(v: string): string {
    try { return decodeURIComponent(v) } catch { return v }
}
