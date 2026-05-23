import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['p-queue'] })],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@engine': resolve(__dirname, 'src/engine')
      }
    },
    build: {
      sourcemap: true,
      minify: false,
      rollupOptions: {
        external: ['sharp']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@engine': resolve(__dirname, 'src/engine')
      }
    },
    build: {
      sourcemap: true,
      minify: false
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@engine': resolve(__dirname, 'src/engine')
      }
    },
    build: {
      sourcemap: true,
      minify: false
    }
  }
})
