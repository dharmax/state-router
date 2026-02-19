import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRouter } from '../src'

describe('Router', () => {
    beforeEach(() => {
        // reset URL parts safely for jsdom
        window.location.hash = ''
        // window.location.search = '' // This causes "Not implemented: navigation" in jsdom
        history.pushState({}, '', '/')
        document.body.innerHTML = ''
    })

    it('bypasses static files', async () => {
        const router = createRouter()
        let called = false
        router.add(/^app\/.+$/, function () {
            called = true
        })

        const handled = router.handleChange('styles.css')
        expect(handled).toBe(false)
        expect(called).toBe(false)
    })

    it('matches regex routes and passes params + query context via this', async () => {
        const router = createRouter()
        const received: { param?: string; q?: string } = {}

        router.add(/^user\/(\d+)$/, function (id: string) {
            received.param = id
            // @ts-ignore
            received.q = this?.queryParams?.q
        })

        // simulate query string
        history.pushState({}, '', '/?q=hello')
        const handled = router.handleChange('user/42')
        expect(handled).toBe(true)
        expect(received.param).toBe('42')
        expect(received.q).toBe('hello')
    })

    it('listen in hash mode reacts to hash changes', async () => {
        const router = createRouter()
        const calls: string[] = []
        router.add(/^page\/(.*)$/, function (slug: string) {
            calls.push(slug)
        })

        router.listen('hash')
        window.location.hash = 'page/alpha'
        window.dispatchEvent(new HashChangeEvent('hashchange'))

        await new Promise(r => setTimeout(r, 0))
        expect(calls).toContain('alpha')
        router.unlisten()
    })

    it('navigate sets hash and triggers handler in hash mode', async () => {
        const router = createRouter()
        let got = ''
        router.add(/^go\/(.*)$/, function (v: string) {
            got = v
        })

        const handled = router.navigate('go/xyz')
        expect(handled).toBe(true)
        expect(window.location.hash).toBe('#go/xyz')
        expect(got).toBe('xyz')
    })

    it('internal navigation in history mode triggers handler', async () => {
        const router = createRouter()
        let hit = ''

        router.add(/^profile$/, function () {
            hit = 'ok'
        })

        document.body.innerHTML = '<a id="lnk" href="/profile">Profile</a>'
        router.listen('history')

        const a = document.getElementById('lnk') as HTMLAnchorElement
        a.click()

        await new Promise(r => setTimeout(r, 0))
        expect(hit).toBe('ok')
        expect(window.location.pathname).toBe('/profile')
        router.unlisten()
    })

    it('add() without pattern matches any path', async () => {
        const router = createRouter()
        let count = 0
        router.add(function () { count++ })
        const handled = router.handleChange('anything/goes')
        expect(handled).toBe(true)
        expect(count).toBe(1)
    })

    it('Enter key on anchor triggers internal navigation (history mode)', async () => {
        const router = createRouter()
        let ok = false
        router.add(/^in$/, function () { ok = true })
        document.body.innerHTML = '<a id="enterLnk" href="/in">In</a>'
        const a = document.getElementById('enterLnk') as HTMLAnchorElement
        router.listen('history')

        const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        a.dispatchEvent(ev)
        await new Promise(r => setTimeout(r, 0))
        expect(ok).toBe(true)
        expect(window.location.pathname).toBe('/in')
        router.unlisten()
    })

    it('ignores modified clicks: ctrl/meta/shift (history mode)', async () => {
        const router = createRouter()
        let called = 0
        router.add(/^x$/, function () { called++ })
        document.body.innerHTML = '<a id="lnk" href="/x">X</a>'
        const a = document.getElementById('lnk') as HTMLAnchorElement
        router.listen('history')

        const spy = vi.spyOn(history, 'pushState')

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 }))
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true, button: 0 }))
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true, button: 0 }))

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(called).toBe(0)
        expect(spy).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('ignores right/middle clicks (history mode)', async () => {
        const router = createRouter()
        let called = 0
        router.add(/^x$/, function () { called++ })
        document.body.innerHTML = '<a id="lnk" href="/x">X</a>'
        const a = document.getElementById('lnk') as HTMLAnchorElement
        router.listen('history')

        const spy = vi.spyOn(history, 'pushState')

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }))
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 2 }))

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(called).toBe(0)
        expect(spy).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('ignores target=_blank, download, rel=noreferrer (history mode)', async () => {
        const router = createRouter()
        let called = 0
        router.add(/^x$/, function () { called++ })
        document.body.innerHTML = [
            '<a id="b" href="/x" target="_blank" rel="noopener noreferrer">X</a>',
            '<a id="d" href="/x" download>Xd</a>',
            '<a id="n" href="/x" rel="noreferrer">Xn</a>'
        ].join('')
        const b = document.getElementById('b') as HTMLAnchorElement
        const d = document.getElementById('d') as HTMLAnchorElement
        const n = document.getElementById('n') as HTMLAnchorElement
        router.listen('history')

        const spy = vi.spyOn(history, 'pushState')

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        d.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(called).toBe(0)
        expect(spy).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('ignores external origins (history mode)', async () => {
        const router = createRouter()
        let called = 0
        router.add(/^x$/, function () { called++ })
        document.body.innerHTML = '<a id="ext" href="https://example.com/x">ext</a>'
        const a = document.getElementById('ext') as HTMLAnchorElement
        router.listen('history')
        const spy = vi.spyOn(history, 'pushState')

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(called).toBe(0)
        expect(spy).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('resetRoot trims base segment (history mode)', async () => {
        const router = createRouter()
        let hit = false
        router.resetRoot('app')
        router.add(/^profile$/, function () { hit = true })
        document.body.innerHTML = '<a id="p" href="/app/profile">P</a>'
        const a = document.getElementById('p') as HTMLAnchorElement
        router.listen('history')
        a.click()
        await new Promise(r => setTimeout(r, 0))
        expect(hit).toBe(true)
        expect(window.location.pathname).toBe('/app/profile')
        expect(router.getLocation()).toBe('profile')
        router.unlisten()
    })

    it('skips interception for static-like href (by extension)', async () => {
        const router = createRouter()
        let called = 0
        router.add(/^x$/, function () { called++ })
        document.body.innerHTML = '<a id="s" href="/file.css">S</a>'
        const a = document.getElementById('s') as HTMLAnchorElement
        router.listen('history')
        const spy = vi.spyOn(history, 'pushState')

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(called).toBe(0)
        expect(spy).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('unlisten removes event listeners (history mode)', async () => {
        const router = createRouter()
        let count = 0
        router.add(/^u$/, function () { count++ })
        document.body.innerHTML = '<a id="u" href="/u">U</a>'
        const a = document.getElementById('u') as HTMLAnchorElement
        router.listen('history')
        router.unlisten()

        // Prevent jsdom navigation error
        const preventNav = (e: Event) => e.preventDefault();
        window.addEventListener('click', preventNav);

        a.click()

        window.removeEventListener('click', preventNav);

        await new Promise(r => setTimeout(r, 0))
        expect(count).toBe(0)
    })

    it('notFound hook is called when nothing matches', async () => {
        const router = createRouter()
        let nf: string | null = null
        router.onNotFound((p) => { nf = p })
        const handled = router.handleChange('no/match')
        expect(handled).toBe(true)
        expect(nf).toBe('no/match')
    })

    it('string pattern with named params populates this.params', async () => {
        const router = createRouter()
        router.setDecodeParams(true)
        let seen: any = null
        router.add('/users/:id', function (id: string) {
            // @ts-ignore
            seen = { idArg: id, params: this.params }
        })
        const handled = router.handleChange('users/123')
        expect(handled).toBe(true)
        expect(seen).toEqual({ idArg: '123', params: { id: '123' } })
    })

    it('getQueryParams() returns parsed query map', () => {
        const router = createRouter()
        history.pushState({}, '', '/?a=1&b=2')
        expect(router.getQueryParams()).toEqual({ a: '1', b: '2' })
    })

    it('setDecodeParams(true) decodes captured values', () => {
        const router = createRouter()
        router.setDecodeParams(true)
        let seen = ''
        router.add(/^u\/(.+)$/, function (name: string) { seen = name })
        const handled = router.handleChange('u/John%20Doe')
        expect(handled).toBe(true)
        expect(seen).toBe('John Doe')
    })

    it('navigate with replace uses replaceState (history mode)', async () => {
        const router = createRouter()
        router.listen('history')
        router.add(/^a$/, function () {})
        router.add(/^b$/, function () {})

        router.navigate('a')
        expect(window.location.pathname).toBe('/a')

        const spyPush = vi.spyOn(history, 'pushState')
        const spyReplace = vi.spyOn(history, 'replaceState')
        router.navigate('b', { replace: true })
        expect(window.location.pathname).toBe('/b')
        expect(spyReplace).toHaveBeenCalledOnce()
        expect(spyPush).not.toHaveBeenCalled()
        router.unlisten()
    })

    it('does NOT intercept clicks for paths that have no matching route', async () => {
        const router = createRouter()
        router.add('/some-other-route', () => {})
        
        const apiPath = '/api/v1/resource'
        document.body.innerHTML = `<a id="api-link" href="${apiPath}">API Call</a>`
        const link = document.getElementById('api-link') as HTMLAnchorElement
        
        router.listen('history')

        // Mock window navigation to prevent jsdom "Not implemented" error if the router DOES NOT intercept
        const originalLocation = window.location
        delete (window as any).location
        // @ts-ignore
        window.location = { 
            ...originalLocation, 
            assign: vi.fn(), 
            href: 'http://localhost/',
            origin: 'http://localhost' 
        }

        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        link.dispatchEvent(event)
        
        await new Promise(r => setTimeout(r, 0))

        window.location = originalLocation
        router.unlisten()

        expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
})
