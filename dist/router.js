class Router {
    mode = 'hash';
    routes = [];
    root = '/';
    baseLocation = null;
    staticFilters = [];
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
        this.root = '/' + this.cleanPathString(root) + '/';
    }
    getLocation() {
        if (this.mode === 'history') {
            let fragment = this.cleanPathString(decodeURI(window.location.pathname + window.location.search));
            fragment = this.clearQuery(fragment);
            return this.root !== '/' ? fragment.replace(this.root, '') : fragment;
        }
        else {
            const match = window.location.href.match(/#(.*)$/);
            return match ? this.clearQuery(match[1]) : '';
        }
    }
    add(pattern, handler) {
        if (typeof pattern === 'function') {
            handler = pattern;
            pattern = /^.*$/; // Match any path
        }
        this.routes.push({ pattern, handler: handler });
        return this;
    }
    handleChange(location) {
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
    listen(mode = 'hash') {
        const self = this;
        this.mode = mode;
        switch (mode) {
            case "hash":
                window.addEventListener('hashchange', () => handler());
                break;
            case "history":
                window.addEventListener('popstate', event => handler(event.state?.path));
                document.addEventListener('click', handleInternalNavigation);
                document.addEventListener('keydown', event => {
                    // @ts-ignore
                    if (event.key === 'Enter' && event.target.tagName === 'A')
                        handleInternalNavigation(event);
                });
        }
        function handleInternalNavigation(event) {
            const node = event.target;
            const href = node.getAttribute('href');
            if (href) {
                event.preventDefault();
                history.pushState({ path: href }, '', href);
                handler(href);
            }
        }
        function handler(path) {
            path = path || location.href.split('#')[0];
            if (self.isStaticFile(path))
                return;
            const currentLocation = self.getLocation();
            if (self.baseLocation !== currentLocation) {
                self.baseLocation = currentLocation;
                self.handleChange(currentLocation);
            }
        }
        handler();
    }
    navigate(path = '') {
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.cleanPathString(path));
        }
        else {
            window.location.hash = '#' + this.cleanPathString(path);
        }
        return this;
    }
}
export const router = new Router();
