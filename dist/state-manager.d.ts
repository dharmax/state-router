import { RoutingMode } from "./router";
import { IPubSubHandle, PubSubEvent } from "@dharmax/pubsub";
export declare type ApplicationStateName = string;
export declare type ApplicationState = {
    name: ApplicationStateName;
    pageName: string;
    route: RegExp;
    mode?: string | string[];
};
export declare class StateManager {
    private allStates;
    private appState;
    private previousState;
    private stateContext;
    static dispatcher: import("@dharmax/pubsub").PubSub;
    constructor(mode?: RoutingMode);
    onChange(handler: (event: PubSubEvent, data: any) => void): IPubSubHandle;
    getState(): ApplicationState;
    get previous(): ApplicationState;
    get context(): ApplicationState;
    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state: ApplicationStateName | [ApplicationStateName, any]);
    /** attempts to restore state from current url */
    restoreState(defaultState: ApplicationStateName): void;
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    setState(stateName: ApplicationStateName, context?: any): boolean;
    /**
     * Define an application state
     * @param name
     * @param pageName by default it equals the name (you can null it)
     * @param route by default it equals the pageName (ditto)
     * @param mode optional
     */
    addState(name: string, pageName?: string, route?: RegExp | string, mode?: string | string[]): void;
    registerStateByState(state: ApplicationState): void;
}
export declare const stateManager: StateManager;
