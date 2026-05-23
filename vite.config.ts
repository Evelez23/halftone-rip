import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

const aliases = {
  '@shared': path.resolve(__dirname, './src/shared'),
  '@main': path.resolve(__dirname, './src/main'),
  '@renderer': path.resolve(__dirname, './src/renderer'),
  '@engine': path.resolve(__dirname, './src/engine')
}

export default defineConfig({
  resolve: {
    alias: aliases
  },
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          resolve: {
            alias: aliases
          },
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'out/main',
            rollupOptions: {
              external: ['electron', 'path', 'fs', 'child_process', 'os', 'url', 'util']
            }
          }
        }
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          resolve: {
            alias: aliases
          },
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'out/preload',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      renderer: {
        vite: {
          resolve: {
            alias: aliases
          },
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'out/renderer'
          }
        }
      }
    })
  ]
})