// Tipos compartidos entre main, renderer y engine

export interface JobConfig {
  lpi: number
  dpi: number
  angle: number
  dotShape: 'round' | 'ellipse' | 'diamond' | 'line' | 'square'
  autoAngles: boolean
  simulateSpot: boolean
  presetName: string
}

export interface Preset {
  id: string
  name: string
  description: string
  config: JobConfig
  category: 'standard' | 'specialty' | 'underbase'
}

export interface Job {
  id: string
  filePath: string
  fileName: string
  fileType: 'pdf' | 'ps' | 'eps'
  status: 'queued' | 'processing' | 'completed' | 'error'
  preset: string
  config: JobConfig
  createdAt: string
  completedAt?: string
  outputPath?: string
  channels?: string[]
  error?: string
  durationMs?: number
}

export interface LogEntry {
  timestamp: string
  jobId: string
  level: 'info' | 'warn' | 'error' | 'debug'
  stage: string
  message: string
  meta?: Record<string, unknown>
}

export interface GhostscriptResult {
  success: boolean
  outputFiles: string[]
  pageCount: number
  spotsDetected: string[]
  error?: string
}

export interface HalftoneChannel {
  name: string
  isSpot: boolean
  angle: number
  lpi: number
  data: Buffer  // TIFF/PNG raw
  width: number
  height: number
  filePath: string // Ruta al archivo PNG de semitono
}

export interface ProcessedPage {
  pageNumber: number
  channels: HalftoneChannel[]
  width: number
  height: number
}

export interface WatcherConfig {
  enabled: boolean
  inputPath: string
  outputPath: string
  preset: string
  recursive: boolean
}

// IPC Channels (tipado fuerte para evitar errores)
export const IPC_CHANNELS = {
  // File operations
  OPEN_FILE: 'file:open',
  SELECT_OUTPUT_DIR: 'file:select-output-dir',
  GET_FILE_INFO: 'file:get-info',

  // Job operations
  START_JOB: 'job:start',
  CANCEL_JOB: 'job:cancel',
  GET_JOBS: 'job:get-all',
  GET_JOB: 'job:get',
  ON_JOB_UPDATE: 'job:on-update',

  // Preset operations
  GET_PRESETS: 'preset:get-all',
  GET_PRESET: 'preset:get',
  SAVE_PRESET: 'preset:save',
  DELETE_PRESET: 'preset:delete',

  // Watcher operations
  GET_WATCHER_CONFIG: 'watcher:get-config',
  SET_WATCHER_CONFIG: 'watcher:set-config',
  TOGGLE_WATCHER: 'watcher:toggle',
  ON_WATCHER_EVENT: 'watcher:on-event',

  // Logs
  GET_LOGS: 'log:get',
  ON_LOG_ENTRY: 'log:on-entry',

  // System
  GET_VERSION: 'system:version',
  GET_GS_VERSION: 'system:gs-version',
  OPEN_LOGS_FOLDER: 'system:open-logs',
  OPEN_OUTPUT_FOLDER: 'system:open-output',
  SHOW_ITEM_IN_FOLDER: 'system:show-item'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
