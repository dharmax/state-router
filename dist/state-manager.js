import { router } from "./router";
import dispatcher from "@dharmax/pubsub";
export class StateManager {
    mode;
    allStates = {};
    appState;
    previousState;
    stateContext;
    static dispatcher = dispatcher;
    changeAuthorities = [];
    router;
    beforeChangeHandlers = [];
    afterChangeHandlers = [];
    constructor(mode = 'hash', autostart = true, routerInstance = router) {
        this.mode = mode;
        this.router = routerInstance;
        if (autostart)
            this.router.listen(mode);
    }
    start() {
        this.router.listen(this.mode);
    }
    stop() {
        // unlisten router to cleanup event listeners
        // @ts-ignore - older Router versions may not have unlisten
        this.router.unlisten && this.router.unlisten();
    }
    onChange(handler) {
        return StateManager.dispatcher.on('state:changed', handler);
    }
    /*
    Add a hook which enable conditional approval of state change. It can be more than one; when a state
    change is requested, all the registered authorities must return true (asynchronously) otherwise the change
    requested doesn't happen.
    **/
    registerChangeAuthority(authorityCallback) {
        this.changeAuthorities.push(authorityCallback);
    }
    getState() {
        return this.appState || {};
    }
    get previous() {
        return this.previousState;
    }
    get context() {
        return this.stateContext;
    }
    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state) {
        if (Array.isArray(state)) {
            const sName = state.shift();
            this.setState(sName, state);
        }
        else
            this.setState(state);
    }
    /** attempts to restore state from current url. Currently, works only in hash mode */
    restoreState(defaultState) {
        if (this.router.navigate(window.location.pathname))
            return;
        this.router.navigate(defaultState);
    }
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    async setState(stateName, context) {
        const newState = this.allStates[stateName];
        if (!newState) {
            alert(`Undefined app state ${stateName}`);
            return false;
        }
        // check if the state change was declined by any change authority and if so - don't do it and return false
        const changeConfirmations = await Promise.all(this.changeAuthorities.map(authority => authority(newState)));
        const vetoes = await Promise.all(this.beforeChangeHandlers.map(h => Promise.resolve(h(newState, context))));
        if (changeConfirmations.includes(false) || vetoes.includes(false))
            return false;
        // perform the change
        this.previousState = this.appState;
        this.stateContext = context;
        this.appState = newState;
        dispatcher.trigger('state-manager', 'state', 'changed', this.appState);
        // afterChange hooks
        for (const cb of this.afterChangeHandlers) {
            await cb(this.appState, context, this.previousState);
        }
        return true;
    }
    /**
     * Define an application state
     * @param name
     * @param pageName by default it equals the name (you can null it)
     * @param route by default it equals the pageName (ditto)
     * @param mode optional
     */
    addState(name, pageName, route, mode) {
        pageName = pageName || name;
        route = route || pageName;
        if (typeof route === 'string' && route.includes('%')) {
            // keep colon-based string patterns intact for Router to compile named params
            const newRoute = route.split('%').join('?(.*)');
            route = new RegExp(`^${newRoute}$`);
        }
        this.registerStateByState({
            name,
            pageName,
            route,
            mode
        });
    }
    registerStateByState(state) {
        this.allStates[state.name] = state;
        const self = this;
        this.router.add(state.route, async function (...captures) {
            // prefer named params (from router string patterns), else multi-captures array, else first capture
            // @ts-ignore
            const named = (this && this.params) || null;
            const context = named && Object.keys(named).length ? named : (captures.length <= 1 ? captures[0] : captures);
            if (await self.setState(state.name, context)) {
                // @ts-ignore
                window.pageChangeHandler && window.pageChangeHandler('send', 'pageview', `/${state.name}/${context || ''}`);
                // @ts-ignore
                window.ga && window.ga('send', 'pageview', `/${state.name}/${context || ''}`);
            }
        });
    }
    onBeforeChange(handler) {
        this.beforeChangeHandlers.push(handler);
    }
    onAfterChange(handler) {
        this.afterChangeHandlers.push(handler);
    }
    onNotFound(handler) {
        // proxy to router-level notFound
        // @ts-ignore - older Router versions may not have onNotFound
        this.router.onNotFound && this.router.onNotFound(handler);
    }
}
export function createStateManager(mode = 'hash', autostart = true, routerInstance = router) {
    return new StateManager(mode, autostart, routerInstance);
}
