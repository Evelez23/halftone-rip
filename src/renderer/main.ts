import { App } from './App'

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string; size?: number; ext?: string }>
      startJob: (filePath: string, presetId: string, configOverride?: Record<string, unknown>) => Promise<{ success: boolean; job?: unknown; error?: string }>
      cancelJob: (jobId: string) => Promise<{ success: boolean }>
      getJobs: () => Promise<unknown[]>
      getPresets: () => Promise<unknown[]>
      getGsVersion: () => Promise<string | null>
      onJobUpdate: (callback: (job: unknown) => void) => () => void
      onLogEntry: (callback: (entry: unknown) => void) => () => void
      onWatcherEvent: (callback: (event: unknown) => void) => () => void
      toggleWatcher: () => Promise<unknown>
      getWatcherConfig: () => Promise<unknown>
      setWatcherConfig: (config: unknown) => Promise<unknown>
      openLogsFolder: () => Promise<void>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new App()
  app.mount(document.getElementById('app')!)
})
