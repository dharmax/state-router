import * as api from '../src/index'

describe('Package index exports', () => {
    it('exports router and StateManager', () => {
        expect(api).toHaveProperty('router')
        expect(api).toHaveProperty('StateManager')
    })
})
import { describe, it, expect } from 'vitest'
