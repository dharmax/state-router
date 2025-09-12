import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        coverage: {
            provider: 'v8',
            reports: ['text', 'html'],
            include: ['src/**/*.ts'],
        },
    },
})

