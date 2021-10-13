
# General 
This package contains a functional router and a web-application state manager.

What is a functional router? it's a router that captures a url changes and 
per specific pattern of url, it simply triggers a handler. It supports hash notation 
as well as normal url patterns. It also supports contexts (url parameters).

Together with the state manager - which will be the main object you'd need 
to work with, you get a very simple semantic application state management: 
each state can be given a logical name, route and an associated page/component.


# Example

## state definitions

```javascript
    stateManager.addState('main', 'main-page', /main$/);
    stateManager.addState('login', 'login-box', 'login')
    stateManager.addState('signup', 'signup-box', /signup/)
    stateManager.addState('my-profile') // will assume the page name and the route are the same...
    stateManager.addState('inbox')
    stateManager.addState('about')
    stateManager.addState('discussion', 'discussion-page', 'discussion/%')
```

## usage in the gui

In your main component, you write something like that:

```javascript

dispatcher.on('state:changed', event => {
    // this specific example works with RiotJs, but you get the drift
    this.update({
        currentPage: event.data.pageName
    })
})


```