import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  return dirPath
}

export function getUserDataPath(): string {
  return app.getPath('userData')
}

export function getLogsDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'logs'))
}

export function getTempDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'temp'))
}

export function getOutputDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'output'))
}

export function getPresetsDir(): string {
  return ensureDir(path.join(getUserDataPath(), 'presets'))
}

export function getJobTempDir(jobId: string): string {
  return ensureDir(path.join(getTempDir(), jobId))
}

export function cleanJobTemp(jobId: string): void {
  const dir = path.join(getTempDir(), jobId)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
}

export function getUniqueFileName(dir: string, baseName: string, ext: string): string {
  let counter = 0
  let fileName = `${baseName}${ext}`
  while (fs.existsSync(path.join(dir, fileName))) {
    counter++
    fileName = `${baseName}_${counter}${ext}`
  }
  return path.join(dir, fileName)
}
