import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            obsidian: new URL('./src/__mocks__/obsidian.ts', import.meta.url).pathname,
        },
    },
});
