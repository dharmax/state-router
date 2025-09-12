describe('Router', () => {
    beforeEach(() => {
        // reset URL parts safely for jsdom
        window.location.hash = ''
        window.location.search = ''
    })

    it('bypasses static files', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
        let called = false
        router.add(/^app\/.+$/, function () {
            // should not be invoked for static file URLs
            called = true
        })

        // ensure static file detection (built-in extensions)
        const handled = router.handleChange('styles.css')
        expect(handled).toBe(false)
        expect(called).toBe(false)
    })

    it('matches regex routes and passes params + query context via this', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
        const received: { param?: string; q?: string } = {}

        router.add(/^user\/(\d+)$/, function (id: string) {
            received.param = id
            // @ts-ignore
            received.q = this?.queryParams?.q
        })

        // Mock URLSearchParams to simulate a query string without real navigation
        const OriginalUSP = URLSearchParams
        // @ts-ignore
        globalThis.URLSearchParams = class extends OriginalUSP {
            constructor(init?: any) {
                super('?q=hello')
            }
        } as any

        const handled = router.handleChange('user/42')
        expect(handled).toBe(true)
        expect(received.param).toBe('42')
        expect(received.q).toBe('hello')

        // restore
        globalThis.URLSearchParams = OriginalUSP as any
    })

    it('listen in hash mode reacts to hash changes', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
        const calls: string[] = []
        router.add(/^page\/(.*)$/, function (slug: string) {
            calls.push(slug)
        })

        router.listen('hash')
        window.location.hash = 'page/alpha'
        // dispatch the event explicitly (jsdom does not always emit automatically)
        window.dispatchEvent(new HashChangeEvent('hashchange'))

        // allow event loop
        await new Promise(r => setTimeout(r, 0))
        expect(calls).toContain('alpha')
    })

    it('navigate sets hash and triggers handler in hash mode', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
        let got = ''
        router.add(/^go\/(.*)$/, function (v: string) {
            got = v
        })

        // hash mode by default
        const handled = router.navigate('go/xyz')
        expect(handled).toBe(true)
        expect(window.location.hash).toBe('#go/xyz')
        expect(got).toBe('xyz')
    })

    it('internal navigation in history mode triggers handler', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
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
    })

    it('add() without pattern matches any path', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
        let count = 0
        router.add(function () { count++ })
        const handled = router.handleChange('anything/goes')
        expect(handled).toBe(true)
        expect(count).toBe(1)
    })

    it('Enter key on anchor triggers internal navigation (history mode)', async () => {
        vi.resetModules()
        const { router } = await import('../src/router')
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
    })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
