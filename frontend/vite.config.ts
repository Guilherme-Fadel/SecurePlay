import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: 'localhost',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true,
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq, request) => {
                        // Same-origin polling may omit Origin; mirror the Pages proxy.
                        if (!request.headers.origin && request.method === 'GET') {
                            proxyReq.setHeader('Origin', 'http://localhost:5173');
                        }
                    });
                },
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
});
