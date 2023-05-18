
# General 
This package contains a functional router and a web-application state manager.

What is a functional router? it's a router that captures a url changes and 
per specific pattern of url, it simply triggers a handler. It supports hash notation 
as well as normal url patterns. It also supports contexts (url parameters).

Together with the **state manager** included here - which will be the main object you'd need 
to work with, you get a very friendly and strong semantic application state management: 
each state can be given a logical name, route and an associated page/component.

# Features
* Very easy to use
* Purely Functional - no need for anything but super simple JS 
* Only one tiny dependency 
* Easily allow any authorization logic to be used 
* Tiny footprint
* Doesn't monopolise the URL 
* Supports state contexts 

# Example

## state definitions

```javascript

    // this is how you define the states: logical name, component name, route (as string or regex) 
    stateManager.addState('main', 'main-page', /main$/);
    stateManager.addState('login', 'login-box', 'login')
    stateManager.addState('signup', 'signup-box', /signup/)
    stateManager.addState('my-profile') // will assume the page name and the route are the same...
    stateManager.addState('inbox') // automatically assume the logical name, component and route are the same 
    stateManager.addState('about')
    stateManager.addState('discussion', 'discussion-page', 'discussion/%') // route with parameter (the % is added to the state's context )

    // this is an example of how you handle the state change (navigation events) 
    stateManager.onChange( event => {
        // this specific example works with RiotJs, but you get the drift
        this.update({
            currentPage: event.data.pageName
        })
    })

    // this is how you can add hooks by which you can block navigation based
    //  on any logic you want.
    stateManager.registerChangeAuthority( async targetState => {
        if ( ! await PermissionManager.isUserAllowedToSeePage(targetState.pageName))
            return false
        return openConfirmDialog('Confirm leaving this page')
    })
    
```
