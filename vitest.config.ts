import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            obsidian: new URL('./src/__mocks__/obsidian.ts', import.meta.url).pathname,
        },
    },
    test: {
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            // Exclude files that require the Obsidian/CM6 runtime and cannot
            // be exercised in the Vitest environment.
            exclude: [
                '**/*.test.ts',
                'src/__mocks__/**',
                // Obsidian/CM6-dependent — require the full runtime to run
                'src/main.ts',
                'src/settings.ts',
                'src/types.ts',
                'src/editor/EntityButtonPlugin.ts',
                'src/editor/EntityPillWidget.ts',
                'src/editor/EntityWidget.ts',
            ],
        },
    },
});
