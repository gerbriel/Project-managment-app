import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command, mode }) => {
  const base = mode === 'production' ? '/Project-managment-app/' : '/';
  const timestamp = Date.now();
  
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
      // Ensure clean builds
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          // Force cache-busting with timestamp
          entryFileNames: `assets/[name]-${timestamp}.[hash].js`,
          chunkFileNames: `assets/[name]-${timestamp}.[hash].js`,
          assetFileNames: `assets/[name]-${timestamp}.[hash].[ext]`
        }
      },
      // Ensure compatibility with GitHub Pages
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
      minify: 'esbuild',
      // Force rebuild
      chunkSizeWarningLimit: 1600
    },
  };
});
