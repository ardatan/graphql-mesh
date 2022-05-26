import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({
      DEBUG: 1,
      NODE_ENV: 'development',
    }),
  },
});
