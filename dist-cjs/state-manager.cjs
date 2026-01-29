"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
exports.createStateManager = createStateManager;
const router_1 = require("./router");
const pubsub_1 = require("@dharmax/pubsub");
class StateManager {
    mode;
    #allStates = {};
    #appState = null;
    #previousState = null;
    #stateContext;
    #currentTransitionId = 0;
    static dispatcher = pubsub_1.default;
    #changeAuthorities = [];
    #router;
    #beforeChangeHandlers = [];
    #afterChangeHandlers = [];
    constructor(mode = 'hash', autostart = true, routerInstance = router_1.router) {
        this.mode = mode;
        this.#router = routerInstance;
        this.#router.setMode(mode);
        if (autostart)
            this.#router.listen(mode);
    }
    start() {
        this.#router.listen(this.mode);
    }
    stop() {
        // unlisten router to cleanup event listeners
        // @ts-ignore - older Router versions may not have unlisten
        this.#router.unlisten && this.#router.unlisten();
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
        this.#changeAuthorities.push(authorityCallback);
    }
    getState() {
        return this.#appState || {};
    }
    get previous() {
        return this.#previousState;
    }
    get context() {
        return this.#stateContext;
    }
    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state) {
        if (Array.isArray(state)) {
            const sName = state.shift();
            this.setState(sName, state.length === 1 ? state[0] : state);
        }
        else
            this.setState(state);
    }
    /** attempts to restore state from current url. */
    restoreState(defaultState) {
        if (this.#router.handleChange())
            return;
        const state = this.#allStates[defaultState];
        let path = defaultState;
        if (state && typeof state.route === 'string') {
            path = state.route;
        }
        this.#router.navigate(path);
    }
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    async setState(stateName, context) {
        const transitionId = ++this.#currentTransitionId;
        const newState = this.#allStates[stateName];
        if (!newState) {
            throw new Error(`Undefined app state ${stateName}`);
        }
        // check if the state change was declined by any change authority and if so - don't do it and return false
        const changeConfirmations = await Promise.all(this.#changeAuthorities.map(authority => authority(newState)));
        if (transitionId !== this.#currentTransitionId)
            return false;
        const vetoes = await Promise.all(this.#beforeChangeHandlers.map(h => Promise.resolve(h(newState, context))));
        if (transitionId !== this.#currentTransitionId)
            return false;
        if (changeConfirmations.includes(false) || vetoes.includes(false))
            return false;
        if (this.#appState && this.#appState.onExit) {
            await this.#appState.onExit(this.#stateContext);
            if (transitionId !== this.#currentTransitionId)
                return false;
        }
        // perform the change
        this.#previousState = this.#appState;
        this.#stateContext = context;
        this.#appState = newState;
        pubsub_1.default.trigger('state-manager', 'state', 'changed', this.#appState);
        // afterChange hooks
        for (const cb of this.#afterChangeHandlers) {
            await cb(this.#appState, context, this.#previousState);
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
        this.#allStates[state.name] = state;
        const self = this;
        this.#router.add(state.route, async function (...captures) {
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
        this.#beforeChangeHandlers.push(handler);
    }
    onAfterChange(handler) {
        this.#afterChangeHandlers.push(handler);
    }
    onExit(stateName, handler) {
        const state = this.#allStates[stateName];
        if (state) {
            state.onExit = handler;
        }
    }
    onNotFound(handler) {
        // proxy to router-level notFound
        // @ts-ignore - older Router versions may not have onNotFound
        this.#router.onNotFound && this.#router.onNotFound(handler);
    }
}
exports.StateManager = StateManager;
function createStateManager(mode = 'hash', autostart = true, routerInstance = router_1.router) {
    return new StateManager(mode, autostart, routerInstance);
}
