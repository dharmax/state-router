import { router } from "./router";
import dispatcher from "@dharmax/pubsub";
export class StateManager {
    constructor(mode = 'hash') {
        this.allStates = {};
        router.mode = mode;
        router.listen();
    }
    onChange(handler) {
        return StateManager.dispatcher.on('state:changed', handler);
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
    /** attempts to restore state from current url */
    restoreState(defaultState) {
        let dest = window.location.hash;
        if (dest == '#login' || dest == '')
            dest = '#' + defaultState;
        router.navigate(dest);
    }
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    setState(stateName, context) {
        const newState = this.allStates[stateName];
        if (!newState) {
            alert(`Undefined app state ${stateName}`);
            return false;
        }
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
        router.add(state.route, (context) => {
            if (this.setState(state.name, context)) {
                // @ts-ignore
                if (window.ga) {
                    // @ts-ignore
                    window.ga('send', 'pageview', `/${state.name}/${context || ''}`);
                }
            }
        });
    }
}
StateManager.dispatcher = dispatcher;
export const stateManager = new StateManager();
