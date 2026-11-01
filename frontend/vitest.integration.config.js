import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { include: ['integration/**/*.test.jsx'], environment: 'jsdom', setupFiles: ['./src/tests/setup.js'], fileParallelism: false } });
