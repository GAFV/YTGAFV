import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    // Salida a un directorio 'dist' en la raíz del proyecto
    outDir: '../dist',
    emptyOutDir: true,
  }
});
