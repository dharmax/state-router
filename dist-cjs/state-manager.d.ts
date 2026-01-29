import { RoutingMode, Router as RouterType } from "./router";
import { IPubSubHandle, PubSubEvent } from "@dharmax/pubsub";
export type ApplicationStateName = string;
export type ApplicationState = {
    name: ApplicationStateName;
    pageName: string;
    route: RegExp | string;
    mode?: string | string[];
    onExit?: (context?: any) => void | Promise<void>;
};
export type ChangeAuthority = (state: ApplicationState) => Promise<boolean>;
export declare class StateManager {
    #private;
    private mode;
    static dispatcher: import("@dharmax/pubsub").PubSub;
    constructor(mode?: RoutingMode, autostart?: boolean, routerInstance?: RouterType);
    start(): void;
    stop(): void;
    onChange(handler: (event: PubSubEvent, data: any) => void): IPubSubHandle;
    registerChangeAuthority(authorityCallback: (targetState: ApplicationState) => Promise<boolean>): void;
    getState(): ApplicationState;
    get previous(): ApplicationState | null;
    get context(): any;
    /**
     * set current page state
     * @param state can be either just a state or a state and context (which can be sub-state, or anything else)
     */
    set state(state: ApplicationStateName | [ApplicationStateName, ...any]);
    /** attempts to restore state from current url. */
    restoreState(defaultState: ApplicationStateName): void;
    /**
     *
     * @param stateName state
     * @param context extra context (e.g. sub-state)
     */
    setState(stateName: ApplicationStateName, context?: any): Promise<boolean>;
    /**
     * Define an application state
     * @param name
     * @param pageName by default it equals the name (you can null it)
     * @param route by default it equals the pageName (ditto)
     * @param mode optional
     */
    addState(name: string, pageName?: string, route?: RegExp | string, mode?: string | string[]): void;
    registerStateByState(state: ApplicationState): void;
    onBeforeChange(handler: (target: ApplicationState, context?: any) => boolean | Promise<boolean>): void;
    onAfterChange(handler: (state: ApplicationState, context?: any, previous?: ApplicationState | null) => void | Promise<void>): void;
    onExit(stateName: ApplicationStateName, handler: (context?: any) => void | Promise<void>): void;
    onNotFound(handler: (path: string) => void): void;
}
export declare function createStateManager(mode?: RoutingMode, autostart?: boolean, routerInstance?: RouterType): StateManager;
