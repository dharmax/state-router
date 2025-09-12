import { describe, it, expect, beforeEach } from 'vitest'
import { createStateManager } from '../src'
import { createRouter } from '../src'

describe('StateManager', () => {
    beforeEach(() => {
        window.location.hash = ''
        window.location.search = ''
        history.pushState({}, '', '/')
    })

    it('transitions to a state and exposes previous + context', async () => {
        const router = createRouter()
        const sm = createStateManager('hash', false, router)

        sm.addState('home', 'home', /^home$/)
        sm.addState('users', 'users', /^users\/(\d+)$/)

        await sm.setState('home')
        expect(sm.getState().name).toBe('home')

        const handled = router.handleChange('users/123')
        expect(handled).toBe(true)
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('users')
        expect(sm.previous?.name).toBe('home')
        expect(sm.context).toBe('123')
    })

    it('declines state change when any authority returns false', async () => {
        const router = createRouter()
        const sm = createStateManager('hash', false, router)
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
        const router = createRouter()
        const sm = createStateManager('hash', false, router)
        sm.addState('docs', 'docs', 'docs%')

        const handled = router.handleChange('docs/guide')
        expect(handled).toBe(true)
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('docs')
        expect(sm.context).toBe('/guide')
    })

    it('publishes state:changed event via onChange()', async () => {
        const sm = createStateManager('hash', false, createRouter())
        sm.addState('one', 'one', /^one$/)

        let seen: string | null = null
        const sub = sm.onChange((event, data) => {
            seen = data?.name
        })

        await sm.setState('one')
        expect(seen).toBe('one')

        // cleanup
        // @ts-ignore
        ;(sm.constructor as any).dispatcher.off(sub)
    })

    it('restoreState navigates to default if current path not routable (hash mode)', async () => {
        const router = createRouter()
        const sm = createStateManager('hash', false, router)
        sm.addState('home', 'home', /^home$/)

        window.location.hash = ''
        sm.restoreState('home')

        await new Promise(r => setTimeout(r, 0))

        expect(window.location.hash).toBe('#home')
        expect(sm.getState().name).toBe('home')
    })

    it('multi-capture context returns array; named params return object', async () => {
        const router = createRouter()
        const sm = createStateManager('hash', false, router)
        sm.addState('multi', 'multi', /^(\w+)-(\w+)$/)
        sm.addState('user', 'user', '/users/:id')

        await new Promise(r => setTimeout(r, 0))
        router.handleChange('foo-bar')
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('multi')
        expect(Array.isArray(sm.context)).toBe(true)
        expect(sm.context).toEqual(['foo', 'bar'])

        router.handleChange('users/555')
        await new Promise(r => setTimeout(r, 0))
        expect(sm.getState().name).toBe('user')
        expect(sm.context).toEqual({ id: '555' })
    })
})
