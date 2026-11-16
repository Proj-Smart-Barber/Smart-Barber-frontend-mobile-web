import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['scripts/snack-tests/**/*.test.ts'],maxWorkers:1,environment:'node'}});
