import { ipcMain } from 'electron'
import { IPC_CHANNELS, Job, JobConfig } from '@shared/types'
import { jobQueue } from '@main/services/job-queue'
import { logger } from '@main/services/logger'

export function registerJobHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.START_JOB, async (_, filePath: string, presetId: string, configOverride?: Partial<JobConfig>) => {
    try {
      const job = await jobQueue.add(filePath, presetId, configOverride)
      return { success: true, job }
    } catch (error) {
      logger.error('system', 'job-handler', 'Error iniciando job', { error: (error as Error).message })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_JOB, async (_, jobId: string) => {
    const success = jobQueue.cancel(jobId)
    return { success }
  })

  ipcMain.handle(IPC_CHANNELS.GET_JOBS, async () => {
    return jobQueue.getAllJobs()
  })

  ipcMain.handle(IPC_CHANNELS.GET_JOB, async (_, jobId: string) => {
    return jobQueue.getJob(jobId)
  })

  // Notificaciones en tiempo real
  ipcMain.on(IPC_CHANNELS.ON_JOB_UPDATE, (event) => {
    const unsubscribe = jobQueue.onUpdate((job) => {
      event.sender.send(IPC_CHANNELS.ON_JOB_UPDATE, job)
    })

    // Limpieza cuando el renderer se desconecta
    event.sender.on('destroyed', unsubscribe)
  })
}
