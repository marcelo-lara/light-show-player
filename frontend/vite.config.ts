import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['s2.local'],
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      clientPort: 3000
    }
  },
});
