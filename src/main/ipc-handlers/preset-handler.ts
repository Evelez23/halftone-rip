import { ipcMain } from 'electron'
import { IPC_CHANNELS, Preset, JobConfig } from '@shared/types'
import { presetManager } from '@main/services/preset-manager'
import { logger } from '@main/services/logger'

export function registerPresetHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_PRESETS, async () => {
    return presetManager.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.GET_PRESET, async (_, id: string) => {
    return presetManager.get(id)
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_PRESET, async (_, preset: Preset) => {
    try {
      presetManager.save(preset)
      return { success: true }
    } catch (error) {
      logger.error('system', 'preset-handler', 'Error guardando preset', { error: (error as Error).message })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_PRESET, async (_, id: string) => {
    const success = presetManager.delete(id)
    return { success }
  })
}
