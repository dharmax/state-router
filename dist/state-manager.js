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
    constructor(mode = 'hash', autostart = true) {
        this.mode = mode;
        if (autostart)
            router.listen(mode);
    }
    start() {
        router.listen(this.mode);
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
        if (Array.isArray(state))
            this.setState(state[0], state[1]);
        else
            this.setState(state);
    }
    /** attempts to restore state from current url. Currently, works only in hash mode */
    restoreState(defaultState) {
        if (router.navigate(window.location.pathname))
            return;
        router.navigate(defaultState);
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
        if (changeConfirmations.includes(false))
            return false;
        // perform the change
        this.previousState = this.appState;
        this.stateContext = context;
        this.appState = newState;
        dispatcher.trigger('state-manager', 'state', 'changed', this.appState);
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
        if (typeof route === "string") {
            let newRoute = route.split('%').join('?(.*)');
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
        router.add(state.route, async (context) => {
            if (await this.setState(state.name, context)) {
                // @ts-ignore
                if (window.ga) {
                    // @ts-ignore
                    window.ga('send', 'pageview', `/${state.name}/${context || ''}`);
                }
            }
        });
    }
}
