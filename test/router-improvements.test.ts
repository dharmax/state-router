import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../src';
import { createStateManager } from '../src/state-manager';

describe('Router Improvements', () => {
    beforeEach(() => {
        // reset URL parts safely for jsdom
        window.location.hash = '';
        // window.location.search = ''; // This causes "Not implemented: navigation" in jsdom
        history.pushState({}, '', '/');
        document.body.innerHTML = '';
    });

    it('2.3: handles clicks on nested elements inside an anchor', async () => {
        const router = createRouter();
        let hit = false;
        router.add(/^nested-link$/, () => {
            hit = true;
        });

        document.body.innerHTML = '<a href="/nested-link"><span>Click Me</span></a>';
        router.listen('history');

        const span = document.querySelector('span');
        span?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

        await new Promise(r => setTimeout(r, 0));
        expect(hit).toBe(true);
        expect(window.location.pathname).toBe('/nested-link');
        router.unlisten();
    });

    it('2.4: popstate handler is resilient to null/missing state', async () => {
        const router = createRouter();
        let path = '';
        router.add(/.*/, function() {
            path = router.getLocation();
        });

        router.listen('history');
        
        // Initial state
        router.navigate('/initial');
        await new Promise(r => setTimeout(r, 0));
        expect(path).toBe('initial');

        // Simulate external script pushing a null state
        history.pushState(null, '', '/external');
        
        // Manually trigger popstate as there's no real back/forward in jsdom
        window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

        await new Promise(r => setTimeout(r, 0));
        expect(path).toBe('external');
        router.unlisten();
    });

    it('4.1: setState throws an error for an undefined state', async () => {
        const sm = createStateManager('hash', false);
        
        await expect(sm.setState('non-existent-state')).rejects.toThrow('Undefined app state non-existent-state');
    });

    it('4.2: restoreState works correctly in history mode', async () => {
        const router = createRouter();
        const sm = createStateManager('history', false, router);
        sm.addState('home', 'home', '/home');
        sm.addState('about', 'about', '/about');

        // 1. Start on a routable URL
        history.pushState({}, '', '/about');
        sm.restoreState('home');
        await new Promise(r => setTimeout(r, 0));
        expect(sm.getState().name).toBe('about');

        // 2. Start on a non-routable URL, should go to default
        history.pushState({}, '', '/unmatched');
        
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        sm.restoreState('home');
        
        await new Promise(r => setTimeout(r, 0));
        expect(sm.getState().name).toBe('home');
        expect(window.location.pathname).toBe('/home');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No routing found'));
        warnSpy.mockRestore();
    });

    it('4.3: staticFilters allows custom filters (compatibility check)', async () => {
        const router = createRouter();
        let called = false;
        router.add(/^ignore-me$/, () => { called = true; });
        
        // Add a filter that ignores "ignore-me"
        // Legacy behavior: return true to ignore
        router.staticFilters.push(url => url.includes('ignore-me'));

        const handled = router.handleChange('ignore-me');
        expect(handled).toBe(false);
        expect(called).toBe(false);
    });
});
