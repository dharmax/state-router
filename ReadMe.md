
# General 
This package contains a functional router and a web-application state manager.

What is a functional router? it's a router that captures a url changes and 
per specific pattern of url, it simply triggers a handler. It supports hash notation 
as well as normal url patterns. It also supports contexts (url parameters).

Together with the state manager - which will be the main object you'd need 
to work with, you get a very simple semantic application state management: 
each state can be given a logical name, route and an associated page/component.

The router by default ignores file extensions '.json', '.css', '.js', '.png', '.jpg', '.svg', '.webp','md'
and you can access the router's staticFilters member to replace or add other rules
for static serving support.

you can use the hash notation or not (set the router's mode to 'history' or 'hash')


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
    stateManager.addState('article', 'article-page', 'article/%','article-mode')
    stateManager.addState('blog', 'article-page', 'blog/%','blog-mode')
```

## usage in the gui

In your main component, you write something like that:

```javascript

stateManager.onChange( event => {
    // this specific example works with RiotJs, but you get the drift
    this.update({
        currentPage: event.data.pageName
    })
})


```

## More
* pageChangeHandler - it's a global optional page change listener that receives ('send', 'pageview', `/${state.name}/${context || ''}`);
* google analytics (ga) is automatically used if it was found
* query parameters are passed to the state context under queryParams object
* on page change, an event state:changed is fired with the new state (that include the context)
* in addState, the last (optional) parameter can contain either a string an array of strings and it can be used for in-state special logic, or sub-states within the same parent-component, for example  