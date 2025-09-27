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
      // Ensure clean builds
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          // Use simpler naming for better GitHub Pages compatibility
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
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
