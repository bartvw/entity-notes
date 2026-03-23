import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            obsidian: resolve(__dirname, 'src/__mocks__/obsidian.ts'),
        },
    },
});
