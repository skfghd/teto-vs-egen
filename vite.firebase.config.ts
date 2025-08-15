import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast'],
          utils: ['clsx', 'tailwind-merge']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001/your-project-id/asia-northeast3/api',
        changeOrigin: true,
        secure: false
      }
    }
  }
});