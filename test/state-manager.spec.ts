describe('StateManager', () => {
    beforeEach(() => {
        window.location.hash = ''
        window.location.search = ''
    })

    it('transitions to a state and exposes previous + context', async () => {
        vi.resetModules()
        const { StateManager } = await import('../src/state-manager')
        const { router } = await import('../src/router')
        const sm = new StateManager('hash', false)

        // define two states, with one capturing context
        sm.addState('home', 'home', /^home$/)
        sm.addState('users', 'users', /^users\/(\d+)$/)

        await sm.setState('home')
        expect(sm.getState().name).toBe('home')

        // trigger via router so context flows
        const handled = router.handleChange('users/123')
        expect(handled).toBe(true)
        // state update happens async via router handler
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('users')
        expect(sm.previous?.name).toBe('home')
        // first capture group becomes context
        expect(sm.context).toBe('123')
    })

    it('declines state change when any authority returns false', async () => {
        vi.resetModules()
        const { StateManager } = await import('../src/state-manager')
        const sm = new StateManager('hash', false)
        sm.addState('A', 'A', /^A$/)
        sm.addState('B', 'B', /^B$/)

        await sm.setState('A')
        expect(sm.getState().name).toBe('A')

        sm.registerChangeAuthority(async (target) => {
            return target.name !== 'B' // deny transitions to B
        })

        const ok = await sm.setState('B')
        expect(ok).toBe(false)
        expect(sm.getState().name).toBe('A')
    })

    it('addState with % expands to capture regex and passes context', async () => {
        vi.resetModules()
        const { StateManager } = await import('../src/state-manager')
        const { router } = await import('../src/router')
        const sm = new StateManager('hash', false)
        // route string with % becomes a capture group
        sm.addState('docs', 'docs', 'docs%')

        const handled = router.handleChange('docs/guide')
        expect(handled).toBe(true)
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('docs')
        expect(sm.context).toBe('/guide')
    })

    it('publishes state:changed event via onChange()', async () => {
        vi.resetModules()
        const { StateManager } = await import('../src/state-manager')
        const sm = new StateManager('hash', false)
        sm.addState('one', 'one', /^one$/)

        let seen: string | null = null
        const sub = sm.onChange((event, data) => {
            seen = data?.name
        })

        await sm.setState('one')
        expect(seen).toBe('one')

        // cleanup
        StateManager.dispatcher.off(sub)
    })

    it('restoreState navigates to default if current path not routable (hash mode)', async () => {
        vi.resetModules()
        const { StateManager } = await import('../src/state-manager')
        const { router } = await import('../src/router')
        const sm = new StateManager('hash', false)
        sm.addState('home', 'home', /^home$/)

        // ensure no hash and no matching route
        window.location.hash = ''
        sm.restoreState('home')

        // allow async change to propagate
        await new Promise(r => setTimeout(r, 0))

        expect(window.location.hash).toBe('#home')
        expect(sm.getState().name).toBe('home')
    })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
