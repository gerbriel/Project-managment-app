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
      rollupOptions: {
        output: {
          manualChunks: undefined,
          // Ensure proper file extensions for GitHub Pages
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Ensure compatibility with GitHub Pages
      target: 'es2015',
      minify: 'esbuild'
    },
  };
});
