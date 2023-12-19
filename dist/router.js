class Router {
    mode = 'hash';
    routes = [];
    root = '/';
    baseLocation = null;
    staticFilters = [];
    constructor() {
        this.staticFilters.push(url => {
            const staticFileExtensions = ['.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp', 'md'];
            return staticFileExtensions.some(ext => url.endsWith(ext));
        });
    }
    clearSlashes(path) {
        return path.replace(/\/$/, '').replace(/^\//, '');
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
        this.root = '/' + this.clearSlashes(root) + '/';
    }
    getLocation() {
        if (this.mode === 'history') {
            let fragment = this.clearSlashes(decodeURI(window.location.pathname + window.location.search));
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
    listen() {
        window.addEventListener(this.mode === 'hash' ? 'hashchange' : 'popstate', () => {
            if (this.isStaticFile(location.href))
                return;
            const currentLocation = this.getLocation();
            if (this.baseLocation !== currentLocation) {
                this.baseLocation = currentLocation;
                this.handleChange(currentLocation);
            }
        });
    }
    navigate(path = '') {
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.clearSlashes(path));
        }
        else {
            window.location.hash = '#' + this.clearSlashes(path);
        }
        return this;
    }
}
export const router = new Router();
