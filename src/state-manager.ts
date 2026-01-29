import {router, RoutingMode, Router as RouterType} from "./router";
import dispatcher, {IPubSubHandle, PubSubEvent} from "@dharmax/pubsub";

export type ApplicationStateName = string

export type ApplicationState = {
    name: ApplicationStateName
    pageName: string
    route: RegExp | string
    mode?: string | string[]
    onExit?: (context?: any) => void | Promise<void>
}

export type ChangeAuthority = (state: ApplicationState) => Promise<boolean>

export class StateManager {
    #allStates: { [name: string]: ApplicationState } = {}
    #appState: ApplicationState | null = null
    #previousState: ApplicationState | null = null
    #stateContext: any
    #currentTransitionId = 0

    public static dispatcher = dispatcher
    #changeAuthorities: ChangeAuthority[] = [];

    #router: RouterType

    #beforeChangeHandlers: Array<(target: ApplicationState, context?: any) => boolean | Promise<boolean>> = []
    #afterChangeHandlers: Array<(state: ApplicationState, context?: any, previous?: ApplicationState | null) => void | Promise<void>> = []

    constructor(private mode: RoutingMode = 'hash', autostart = true, routerInstance: RouterType = router) {
        this.#router = routerInstance
        this.#router.setMode(mode);
        if (autostart)
            this.#router.listen(mode)
    }

    start() {
        this.#router.listen(this.mode)
    }

    stop() {
        // unlisten router to cleanup event listeners
        // @ts-ignore - older Router versions may not have unlisten
        this.#router.unlisten && (this.#router as any).unlisten()
    }

    onChange(handler: (event: PubSubEvent, data: any) => void): IPubSubHandle {

        return StateManager.dispatcher.on('state:changed', handler)
    }

    /*
    Add a hook which enable conditional approval of state change. It can be more than one; when a state
    change is requested, all the registered authorities must return true (asynchronously) otherwise the change
    requested doesn't happen.
    **/
    registerChangeAuthority(authorityCallback: (targetState: ApplicationState) => Promise<boolean>) {
        this.#changeAuthorities.push(authorityCallback)
    }

    getState(): ApplicationState {
        return this.#appState || <ApplicationState>{}
    }

    get previous() {
        return this.#previousState
    }

    get context(): any {
        return this.#stateContext
    }

    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state: ApplicationStateName | [ApplicationStateName, ...any]) {
        if (Array.isArray(state)) {
            const sName = state.shift()
            this.setState(sName, state.length === 1 ? state[0] : state)
        } else
            this.setState(state)
    }

    /** attempts to restore state from current url. */
    restoreState(defaultState: ApplicationStateName) {
        if (this.#router.handleChange())
            return
        
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
    async setState(stateName: ApplicationStateName, context?: any): Promise<boolean> {
        const transitionId = ++this.#currentTransitionId;

        const newState = this.#allStates[stateName];
        if (!newState) {
            throw new Error(`Undefined app state ${stateName}`);
        }

        // check if the state change was declined by any change authority and if so - don't do it and return false
        const changeConfirmations = await Promise.all(this.#changeAuthorities.map(authority => authority(newState)))
        if (transitionId !== this.#currentTransitionId) return false;

        const vetoes = await Promise.all(this.#beforeChangeHandlers.map(h => Promise.resolve(h(newState, context))))
        if (transitionId !== this.#currentTransitionId) return false;

        if (changeConfirmations.includes(false) || vetoes.includes(false))
            return false

        if (this.#appState && this.#appState.onExit) {
             await this.#appState.onExit(this.#stateContext);
             if (transitionId !== this.#currentTransitionId) return false;
        }

        // perform the change
        this.#previousState = this.#appState
        this.#stateContext = context
        this.#appState = newState
        dispatcher.trigger('state-manager', 'state', 'changed', this.#appState)
        // afterChange hooks
        for (const cb of this.#afterChangeHandlers) {
            await cb(this.#appState, context, this.#previousState)
        }
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
        if (typeof route === 'string' && route.includes('%')) {
            // keep colon-based string patterns intact for Router to compile named params
            const newRoute = route.split('%').join('?(.*)')
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
        this.#allStates[state.name] = state
        const self = this
        this.#router.add(state.route, async function(...captures: any[]) {
            // prefer named params (from router string patterns), else multi-captures array, else first capture
            // @ts-ignore
            const named = (this && (this as any).params) || null
            const context = named && Object.keys(named).length ? named : (captures.length <= 1 ? captures[0] : captures)
            if (await self.setState(state.name, context)) {
                // @ts-ignore
                window.pageChangeHandler && window.pageChangeHandler('send', 'pageview', `/${state.name}/${context || ''}`);
                // @ts-ignore
                window.ga && window.ga('send', 'pageview', `/${state.name}/${context || ''}`);
            }
        })
    }

    onBeforeChange(handler: (target: ApplicationState, context?: any) => boolean | Promise<boolean>) {
        this.#beforeChangeHandlers.push(handler)
    }

    onAfterChange(handler: (state: ApplicationState, context?: any, previous?: ApplicationState | null) => void | Promise<void>) {
        this.#afterChangeHandlers.push(handler)
    }

    onExit(stateName: ApplicationStateName, handler: (context?: any) => void | Promise<void>) {
        const state = this.#allStates[stateName];
        if (state) {
            state.onExit = handler;
        }
    }

    onNotFound(handler: (path: string) => void) {
        // proxy to router-level notFound
        // @ts-ignore - older Router versions may not have onNotFound
        this.#router.onNotFound && (this.#router as any).onNotFound(handler)
    }
}

export function createStateManager(mode: RoutingMode = 'hash', autostart = true, routerInstance: RouterType = router): StateManager {
    return new StateManager(mode, autostart, routerInstance)
}
