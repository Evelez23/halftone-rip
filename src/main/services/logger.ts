import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { LogEntry } from '@shared/types'
import { getLogsDir } from '@main/utils/paths'

class Logger {
  private currentLogFile: string
  private writeStream: fs.WriteStream | null = null
  private listeners: Set<(entry: LogEntry) => void> = new Set()

  constructor() {
    this.currentLogFile = this.getLogFilePath()
    this.openStream()

    // Rotar logs diariamente
    setInterval(() => {
      const newPath = this.getLogFilePath()
      if (newPath !== this.currentLogFile) {
        this.rotate()
      }
    }, 60000) // check cada minuto
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]
    return path.join(getLogsDir(), `halftone-rip-${date}.jsonl`)
  }

  private openStream(): void {
    if (this.writeStream) {
      this.writeStream.end()
    }
    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' })
  }

  private rotate(): void {
    this.currentLogFile = this.getLogFilePath()
    this.openStream()
    this.info('system', 'Log rotated', { newFile: this.currentLogFile })
  }

  private write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n'
    if (this.writeStream) {
      this.writeStream.write(line)
    }
    // Notificar listeners (UI en tiempo real)
    this.listeners.forEach(cb => {
      try { cb(entry) } catch (e) { /* ignore */ }
    })
  }

  log(jobId: string, level: LogEntry['level'], stage: string, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      jobId,
      level,
      stage,
      message,
      meta
    }
    this.write(entry)

    // También a consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${stage}]`
      if (level === 'error') console.error(prefix, message, meta || '')
      else if (level === 'warn') console.warn(prefix, message, meta || '')
      else console.log(prefix, message, meta || '')
    }
  }

  info(jobId: string, stage: string, message: string, meta?: Record<string, unknown>): void {
    this.log(jobId, 'info', stage, message, meta)
  }

  warn(jobId: string, stage: string, message: string, meta?: Record<string, unknown>): void {
    this.log(jobId, 'warn', stage, message, meta)
  }

  error(jobId: string, stage: string, message: string, meta?: Record<string, unknown>): void {
    this.log(jobId, 'error', stage, message, meta)
  }

  debug(jobId: string, stage: string, message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(jobId, 'debug', stage, message, meta)
    }
  }

  onEntry(callback: (entry: LogEntry) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  getRecentEntries(jobId?: string, limit: number = 500): LogEntry[] {
    const logPath = this.currentLogFile
    if (!fs.existsSync(logPath)) return []

    const lines = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as LogEntry)

    const filtered = jobId ? lines.filter(e => e.jobId === jobId) : lines
    return filtered.slice(-limit)
  }

  getLogFiles(): string[] {
    const dir = getLogsDir()
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse()
  }
}

export const logger = new Logger()
