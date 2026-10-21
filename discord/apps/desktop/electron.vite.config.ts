import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // electron-updater procura os arquivos da atualização em tempo de execução.
    build: {
      rollupOptions: {
        external: ['electron-updater'],
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [react()],
  },
})
