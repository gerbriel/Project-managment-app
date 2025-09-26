import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command, mode }) => {
  const base = mode === 'production' ? '/Project-managment-app/' : '/';
  
  return {
    plugins: [react(), tsconfigPaths()],
    base,
    server: {
      port: 5173,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      assetsDir: 'assets',
    },
  };
});
