import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import { getGhostscriptVersion } from './services/ghostscript'
import { presetManager } from './services/preset-manager'
import { watcherService } from './services/watcher'
import { logger } from './services/logger'
import { registerFileHandlers } from './ipc-handlers/file-handler'
import { registerJobHandlers } from './ipc-handlers/job-handler'
import { registerPresetHandlers } from './ipc-handlers/preset-handler'
import { IPC_CHANNELS } from '@shared/types'
import { getPaths } from '@shared/constants'
import { ensureDir } from './utils/paths'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Halftone RIP Pro',
    show: false, // mostrar cuando esté listo
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // necesario para acceso a filesystem via preload
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  })

  // Cargar UI
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Abrir links externos en navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Inicialización de la app
app.whenReady().then(async () => {
  // Crear directorios de usuario
  const paths = getPaths()
  ensureDir(paths.LOGS_DIR)
  ensureDir(paths.TEMP_DIR)
  ensureDir(paths.OUTPUT_DIR)
  ensureDir(paths.PRESETS_DIR)
  ensureDir(paths.ICC_DIR)

  // Inicializar servicios
  await presetManager.init()

  // Registrar IPC handlers
  registerFileHandlers()
  registerJobHandlers()
  registerPresetHandlers()

  // System handlers
  ipcMain.handle(IPC_CHANNELS.GET_VERSION, () => app.getVersion())
  ipcMain.handle(IPC_CHANNELS.GET_GS_VERSION, async () => {
    try {
      return await getGhostscriptVersion()
    } catch {
      return null
    }
  })

  // Watcher handlers
  ipcMain.handle(IPC_CHANNELS.GET_WATCHER_CONFIG, () => watcherService.getConfig())
  ipcMain.handle(IPC_CHANNELS.SET_WATCHER_CONFIG, (_, config) => {
    watcherService.setConfig(config)
    return watcherService.getConfig()
  })
  ipcMain.handle(IPC_CHANNELS.TOGGLE_WATCHER, () => watcherService.toggle())

  // Log handlers
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, (_, jobId?: string, limit?: number) => {
    return logger.getRecentEntries(jobId, limit)
  })

  // Notificaciones de logs en tiempo real
  logger.onEntry((entry) => {
    mainWindow?.webContents.send(IPC_CHANNELS.ON_LOG_ENTRY, entry)
  })

  // Notificaciones de watcher
  watcherService.onEvent((event) => {
    mainWindow?.webContents.send(IPC_CHANNELS.ON_WATCHER_EVENT, event)
  })

  createWindow()

  logger.info('system', 'app', 'Aplicación iniciada', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  })

  // Verificar Ghostscript
  try {
    const gsVersion = await getGhostscriptVersion()
    logger.info('system', 'app', `Ghostscript detectado: ${gsVersion}`)
  } catch {
    logger.warn('system', 'app', 'Ghostscript NO detectado. Instálalo para usar la app.')
  }
})

app.on('window-all-closed', () => {
  watcherService.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  watcherService.stop()
  logger.info('system', 'app', 'Aplicación cerrándose')
})

// Manejo de archivo por doble-click (Windows/Linux)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_, argv) => {
    // En Windows, argv contiene el archivo al abrir por asociación
    const filePath = argv.find(arg => 
      arg.toLowerCase().endsWith('.ps') || 
      arg.toLowerCase().endsWith('.eps') || 
      arg.toLowerCase().endsWith('.pdf')
    )

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()

      if (filePath) {
        mainWindow.webContents.send('app:open-file', filePath)
      }
    }
  })

  // Archivo pasado por línea de comandos al iniciar
  const initialFile = process.argv.find(arg => 
    arg.toLowerCase().endsWith('.ps') || 
    arg.toLowerCase().endsWith('.eps') || 
    arg.toLowerCase().endsWith('.pdf')
  )

  if (initialFile) {
    app.whenReady().then(() => {
      setTimeout(() => {
        mainWindow?.webContents.send('app:open-file', initialFile)
      }, 1000)
    })
  }
}
