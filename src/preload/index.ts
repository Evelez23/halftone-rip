import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IpcChannel } from '@shared/types'

// API expuesta al renderer de forma segura
const api = {
  // File operations
  openFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE),
  selectOutputDir: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT_DIR),
  getFileInfo: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_INFO, filePath),
  openLogsFolder: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOGS_FOLDER),
  openOutputFolder: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_OUTPUT_FOLDER),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_ITEM_IN_FOLDER, filePath),

  // Job operations
  startJob: (filePath: string, presetId: string, configOverride?: Record<string, unknown>) => 
    ipcRenderer.invoke(IPC_CHANNELS.START_JOB, filePath, presetId, configOverride),
  cancelJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_JOB, jobId),
  getJobs: () => ipcRenderer.invoke(IPC_CHANNELS.GET_JOBS),
  getJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_JOB, jobId),
  onJobUpdate: (callback: (job: unknown) => void) => {
    const handler = (_: unknown, job: unknown) => callback(job)
    ipcRenderer.on(IPC_CHANNELS.ON_JOB_UPDATE, handler)
    ipcRenderer.send(IPC_CHANNELS.ON_JOB_UPDATE)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_JOB_UPDATE, handler)
  },

  // Preset operations
  getPresets: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PRESETS),
  getPreset: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_PRESET, id),
  savePreset: (preset: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_PRESET, preset),
  deletePreset: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PRESET, id),

  // Watcher operations
  getWatcherConfig: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WATCHER_CONFIG),
  setWatcherConfig: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SET_WATCHER_CONFIG, config),
  toggleWatcher: () => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_WATCHER),
  onWatcherEvent: (callback: (event: unknown) => void) => {
    const handler = (_: unknown, event: unknown) => callback(event)
    ipcRenderer.on(IPC_CHANNELS.ON_WATCHER_EVENT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_WATCHER_EVENT, handler)
  },

  // Logs
  getLogs: (jobId?: string, limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, jobId, limit),
  onLogEntry: (callback: (entry: unknown) => void) => {
    const handler = (_: unknown, entry: unknown) => callback(entry)
    ipcRenderer.on(IPC_CHANNELS.ON_LOG_ENTRY, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_LOG_ENTRY, handler)
  },

  // System
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VERSION),
  getGsVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_GS_VERSION),

  // Utilidades
  on: (channel: IpcChannel, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, callback)
  },
  off: (channel: IpcChannel, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
