import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const httpsEnabled = process.env.VITE_HTTPS === '1' || process.env.NODE_ENV === 'development';

const httpsConfig = httpsEnabled
  ? (() => {
      const certDir = path.join(process.cwd(), '.vite-certs');
      const keyPath = path.join(certDir, 'key.pem');
      const certPath = path.join(certDir, 'cert.pem');

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
      }

      console.warn(
        'Vite HTTPS certs not found in .vite-certs/. Generate them with:\n' +
        '  npx mkcert -install\n' +
        '  npx mkcert -key-file .vite-certs/key.pem -cert-file .vite-certs/cert.pem localhost 127.0.0.1'
      );

      return undefined;
    })()
  : undefined;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    ...(httpsConfig ? { https: httpsConfig } : {}),
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  }
})
