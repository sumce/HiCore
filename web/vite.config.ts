import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    allowedHosts: [
      'work-1.frp.aosa.me' // Allow the specific FRP host
    ],
    hmr: {
      host: 'work-1.frp.aosa.me', // Force the HMR websocket to connect to your FRP domain
      clientPort: 80, // Tell the browser that the public port is 80 (standard HTTP), not 5173
    }
  }
});
