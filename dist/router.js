export class Router {
    mode = 'hash';
    routes = [];
    root = '/';
    rootCompare = '';
    baseLocation = null;
    staticFilters = [];
    isListening = false;
    bound = {};
    notFoundHandler;
    decodeParams = false;
    constructor() {
        this.staticFilters.push(url => {
            const staticFileExtensions = ['.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp', '.md', '.ejs', '.jsm', '.txt'];
            return staticFileExtensions.some(ext => url.endsWith(ext));
        });
    }
    cleanPathString(path) {
        path = path.replace(/\/$/, '').replace(/^\//, '');
        return path = path.replace(/#{2,}/g, '#');
    }
    clearQuery(url) {
        const [path, query] = url.split('?');
        if (!query)
            return path;
        const [_, hash] = query.split('#');
        return hash ? `${path}#${hash}` : path;
    }
    isStaticFile(url) {
        return (this.staticFilters || []).some(filter => filter(url));
    }
    resetRoot(root) {
        const cleaned = this.cleanPathString(root);
        this.root = '/' + cleaned + '/';
        this.rootCompare = cleaned ? cleaned + '/' : '';
    }
    getLocation() {
        if (!this.isBrowser())
            return '';
        if (this.mode === 'history') {
            let fragment = decodeURI(window.location.pathname + window.location.search);
            fragment = this.clearQuery(fragment);
            // strip leading slash for comparison convenience
            fragment = fragment.replace(/^\//, '');
            if (this.root !== '/' && this.rootCompare && fragment.startsWith(this.rootCompare)) {
                fragment = fragment.slice(this.rootCompare.length);
            }
            fragment = this.cleanPathString(fragment);
            return fragment;
        }
        else {
            const match = window.location.href.match(/#(.*)$/);
            return match ? this.clearQuery(match[1]) : '';
        }
    }
    add(pattern, handler) {
        let paramNames;
        if (typeof pattern === 'function') {
            handler = pattern;
            pattern = /^.*$/; // Match any path
        }
        else if (typeof pattern === 'string') {
            const compiled = this.compilePattern(pattern);
            pattern = compiled.regex;
            paramNames = compiled.paramNames;
        }
        this.routes.push({ pattern: pattern, handler: handler, paramNames });
        return this;
    }
    onNotFound(handler) {
        this.notFoundHandler = handler;
        return this;
    }
    setDecodeParams(decode) {
        this.decodeParams = decode;
        return this;
    }
    getQueryParams(search) {
        if (!this.isBrowser() && !search)
            return {};
        const qs = typeof search === 'string' ? search : window.location.search || '';
        const usp = new URLSearchParams(qs);
        const obj = {};
        usp.forEach((v, k) => { obj[k] = v; });
        return obj;
    }
    isBrowser() {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }
    compilePattern(pattern) {
        // normalize leading slash to align with cleanPathString behavior
        const normalized = pattern.replace(/^\//, '');
        const paramNames = [];
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
    handleChange(location) {
        const path = (location ?? this.getLocation()) || '';
        if (this.isStaticFile(path))
            return false; // Bypass routing for static files
        for (const route of this.routes) {
            const match = route.pattern ? path.match(route.pattern) : null;
            if (match) {
                match.shift(); // Remove the full match element
                const queryParams = this.getQueryParams();
                const captures = this.decodeParams ? match.map(v => safeDecode(v)) : match;
                let params;
                if (route.paramNames && route.paramNames.length) {
                    params = {};
                    route.paramNames.forEach((n, i) => params[n] = captures[i]);
                }
                route.handler.call({ queryParams, params }, ...captures);
                return true;
            }
        }
        if (this.notFoundHandler) {
            this.notFoundHandler(path);
            return true;
        }
        if (path)
            console.warn(`No routing found for ${path}`);
        return false;
    }
    listen(mode = 'hash') {
        if (!this.isBrowser())
            return;
        // avoid duplicate listeners
        if (this.isListening)
            this.unlisten();
        const self = this;
        this.mode = mode;
        const handler = (path) => {
            const p = path || location.href.split('#')[0];
            if (self.isStaticFile(p))
                return;
            const currentLocation = self.getLocation();
            if (self.baseLocation !== currentLocation) {
                self.baseLocation = currentLocation;
                self.handleChange(currentLocation);
            }
        };
        const handleInternalNavigation = (event) => {
            // modified clicks or non-left clicks
            const me = event;
            if (event.type === 'click') {
                if (me.button !== 0)
                    return; // left-click only
                if (me.metaKey || me.ctrlKey || me.shiftKey)
                    return;
            }
            const target = event.target;
            if (!target || !('closest' in target))
                return;
            const anchor = target.closest?.('a');
            if (!anchor)
                return;
            if (event.type === 'keydown') {
                const ke = event;
                if (ke.key !== 'Enter')
                    return;
            }
            const href = anchor.getAttribute('href') || '';
            if (!href)
                return;
            const url = new URL(href, window.location.href);
            // ignore external origins or different hostnames
            if (url.origin !== window.location.origin)
                return;
            // ignore target=_blank, download, or rel=noreferrer
            const t = anchor.getAttribute('target');
            if (t && t.toLowerCase() === '_blank')
                return;
            if (anchor.hasAttribute('download'))
                return;
            const rel = anchor.getAttribute('rel');
            if (rel && /\bnoreferrer\b/i.test(rel))
                return;
            const pathWithQuery = url.pathname + (url.search || '');
            if (self.isStaticFile(pathWithQuery) || self.isStaticFile(url.pathname))
                return;
            event.preventDefault();
            history.pushState({ path: pathWithQuery }, '', pathWithQuery);
            handler(pathWithQuery);
        };
        switch (mode) {
            case 'hash':
                this.bound.hashchange = () => handler();
                window.addEventListener('hashchange', this.bound.hashchange);
                break;
            case 'history':
                this.bound.popstate = (event) => handler(event.state?.path);
                this.bound.click = handleInternalNavigation;
                this.bound.keydown = (event) => handleInternalNavigation(event);
                window.addEventListener('popstate', this.bound.popstate);
                document.addEventListener('click', this.bound.click);
                document.addEventListener('keydown', this.bound.keydown);
                break;
        }
        this.isListening = true;
        handler();
    }
    unlisten() {
        if (!this.isBrowser() || !this.isListening)
            return;
        switch (this.mode) {
            case 'hash':
                if (this.bound.hashchange)
                    window.removeEventListener('hashchange', this.bound.hashchange);
                break;
            case 'history':
                if (this.bound.popstate)
                    window.removeEventListener('popstate', this.bound.popstate);
                if (this.bound.click)
                    document.removeEventListener('click', this.bound.click);
                if (this.bound.keydown)
                    document.removeEventListener('keydown', this.bound.keydown);
                break;
        }
        this.bound = {};
        this.isListening = false;
    }
    navigate(path = '', opts) {
        if (!this.isBrowser())
            return false;
        if (this.mode === 'history') {
            const url = this.root + this.cleanPathString(path);
            if (opts?.replace)
                history.replaceState(null, '', url);
            else
                history.pushState(null, '', url);
        }
        else
            window.location.hash = this.cleanPathString(path);
        return this.handleChange();
    }
    replace(path = '') {
        return this.navigate(path, { replace: true });
    }
}
export const router = new Router();
export function createRouter() { return new Router(); }
function safeDecode(v) {
    try {
        return decodeURIComponent(v);
    }
    catch {
        return v;
    }
}
