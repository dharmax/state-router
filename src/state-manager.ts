import {router, RoutingMode} from "./router";
import dispatcher, {IPubSubHandle, PubSubEvent} from "@dharmax/pubsub";


export type ApplicationStateName = string

export type ApplicationState = {
    name: ApplicationStateName
    pageName: string
    route: RegExp
    mode?: string | string[]
}


export class StateManager {
    private allStates: { [name: string]: ApplicationState } = {}
    private appState: ApplicationState
    private previousState: ApplicationState
    private stateContext: ApplicationState

    public static dispatcher = dispatcher

    constructor(mode: RoutingMode = 'hash') {

        router.mode = mode
        router.listen()

    }

    onChange(handler: (event: PubSubEvent, data: any) => void):IPubSubHandle {

        return StateManager.dispatcher.on('state:changed', handler)
    }

    getState(): ApplicationState {
        return this.appState || <ApplicationState>{}
    }

    get previous() {
        return this.previousState
    }

    get context() {
        return this.stateContext
    }

    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state: ApplicationStateName | [ApplicationStateName, any]) {
        if (Array.isArray(state))
            this.setState(state[0], state[1])
        else
            this.setState(state)
    }

    /** attempts to restore state from current url */
    restoreState(defaultState: ApplicationStateName) {
        let dest = window.location.hash
        if (dest == '#login' || dest == '')
            dest = '#' + defaultState
        router.navigate(dest)
    }

    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    setState(stateName: ApplicationStateName, context?: any): boolean {

        const newState = this.allStates[stateName];
        if (!newState) {
            alert(`Undefined app state ${stateName}`)
            return false
        }

        this.previousState = this.appState
        this.stateContext = context
        this.appState = newState
        dispatcher.trigger('state-manager', 'state', 'changed', this.appState)
        return true
    }

    /**
     * Define an application state
     * @param name
     * @param pageName by default it equals the name (you can null it)
     * @param route by default it equals the pageName (ditto)
     * @param mode optional
     */
    addState(name: string, pageName?: string, route?: RegExp | string, mode?: string | string[]) {

        pageName = pageName || name
        route = route || pageName
        if (typeof route === "string") {
            let newRoute = route.split('%').join('?(.*)')
            route = new RegExp(`^${newRoute}$`)
        }
        this.registerStateByState({
            name,
            pageName,
            route,
            mode
        })
    }

    registerStateByState(state: ApplicationState) {
        this.allStates[state.name] = state
        router.add(state.route, (context: any) => {
            if (this.setState(state.name, context)) {

                // @ts-ignore
                if (window.ga) {
                    // @ts-ignore
                    window.ga('send', 'pageview', `/${state.name}/${context || ''}`);
                }

            }
        })
    }
}

export const stateManager = new StateManager()