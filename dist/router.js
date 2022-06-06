class Route {
    constructor() {
        this.re = null;
        this.handler = null;
    }
}
export const router = new class {
    constructor() {
        this.mode = 'hash';
        this.routes = [];
        this.root = '/';
        this.baseLocation = null;
    }
    resetRoot(root) {
        this.root = '/' + this.clearSlashes(root) + '/';
    }
    getLocation() {
        let fragment = '';
        if (this.mode === 'history') {
            fragment = this.clearSlashes(decodeURI(location.pathname + location.search));
            fragment = this.clearQuery(fragment);
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
        }
        else {
            const match = window.location.href.match(/#(.*)$/);
            fragment = this.clearQuery(fragment);
            fragment = match ? match[1] : '';
        }
        return this.clearSlashes(fragment);
    }
    clearSlashes(path) {
        return path.toString().replace(/\/$/, '').replace(/^\//, '');
    }
    clearQuery(url) {
        if (url.indexOf('?') === -1)
            return url;
        const a = url.split('?');
        const afterHash = a[1].split('#');
        if (!afterHash)
            return a[0];
        return `${a[0]}#${afterHash}`;
    }
    add(re, handler) {
        if (typeof re == 'function') {
            handler = re;
            re = null;
        }
        this.routes.push({ re: re, handler });
        return this;
    }
    process(location) {
        const fragment = location || this.getLocation();
        const matches = this.routes.filter((r) => fragment.match(r.re))
            .sort((r1, r2) => {
            const [n1, n2] = [r1, r2].map(r => r.re.source.split('/'));
            return n2.length - n1.length;
        })
            .map(r => {
            return { r, match: fragment.match(r.re) };
        });
        if (!matches.length) {
            console.warn(`No routing found for ${fragment}`);
            return;
        }
        const longestMatch = matches[0];
        longestMatch.match.shift();
        longestMatch.r.handler.apply({}, longestMatch.match);
        return this;
    }
    listen() {
        this.baseLocation = this.getLocation();
        window[this.mode === 'hash' ? 'onhashchange' : 'onpopstate'] = () => {
            const place = this.getLocation();
            if (this.baseLocation !== place) {
                this.baseLocation = place;
                this.process(place);
            }
        };
        return this;
    }
    navigate(path) {
        path = path ? path : '';
        if (this.mode === 'history') {
            history.pushState(null, null, this.root + this.clearSlashes(path));
        }
        else {
            path = path.startsWith('#') ? path : '#' + path;
            window.location.href = window.location.href.replace(/#(.*)$/, '') + path;
            this.process();
        }
        return this;
    }
};
