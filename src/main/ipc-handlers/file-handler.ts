import { ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { IPC_CHANNELS } from '@shared/types'
import { getOutputDir } from '@main/utils/paths'
import { logger } from '@main/services/logger'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Archivos soportados', extensions: ['ps', 'eps', 'pdf'] },
        { name: 'PostScript', extensions: ['ps'] },
        { name: 'EPS', extensions: ['eps'] },
        { name: 'PDF', extensions: ['pdf'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    const stats = fs.statSync(filePath)

    logger.info('system', 'file-handler', 'Archivo seleccionado', { filePath })

    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath),
      size: stats.size,
      ext: path.extname(filePath).toLowerCase().slice(1)
    }
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_OUTPUT_DIR, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: getOutputDir()
    })

    if (result.canceled) {
      return { canceled: true }
    }

    return {
      canceled: false,
      path: result.filePaths[0]
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_FILE_INFO, async (_, filePath: string) => {
    try {
      const stats = fs.statSync(filePath)
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        ext: path.extname(filePath).toLowerCase().slice(1)
      }
    } catch {
      return { exists: false }
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_LOGS_FOLDER, async () => {
    const logsDir = path.join(getOutputDir(), '..', 'logs')
    shell.openPath(logsDir)
  })
  
  ipcMain.handle(IPC_CHANNELS.OPEN_OUTPUT_FOLDER, async () => {
    shell.openPath(getOutputDir())
  })

  ipcMain.handle(IPC_CHANNELS.SHOW_ITEM_IN_FOLDER, async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
