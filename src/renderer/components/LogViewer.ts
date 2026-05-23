export interface LogViewerOptions {
  maxEntries?: number
}

export class LogViewer {
  private container: HTMLElement | null = null
  private entries: Array<{ timestamp: string; level: string; stage: string; message: string }> = []
  private options: LogViewerOptions

  constructor(options: LogViewerOptions = {}) {
    this.options = options
    this.maxEntries = options.maxEntries || 100
  }

  private maxEntries: number

  mount(element: HTMLElement): void {
    this.container = element
    this.render()
  }

  addEntry(entry: { timestamp: string; level: string; stage: string; message: string }): void {
    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }
    this.render()
    this.scrollToBottom()
  }

  private render(): void {
    if (!this.container) return

    if (this.entries.length === 0) {
      this.container.innerHTML = `
        <div class="log-panel" style="text-align:center;color:var(--muted);padding:2rem">
          Los logs aparecerán aquí en tiempo real...
        </div>
      `
      return
    }

    this.container.innerHTML = `
      <div class="log-panel" id="logPanel">
        ${this.entries.map(e => {
          const time = new Date(e.timestamp).toLocaleTimeString('es', { hour12: false })
          const levelClass = `log-level-${e.level}`
          const prefix = e.level === 'error' ? '❌' : e.level === 'warn' ? '⚠️' : e.level === 'success' ? '✓' : '→'
          return `
            <div class="log-entry">
              <span class="log-time">[${time}]</span>
              <span class="${levelClass}">${prefix} [${e.stage}]</span>
              <span class="log-msg">${e.message}</span>
            </div>
          `
        }).join('')}
      </div>
    `
  }

  private scrollToBottom(): void {
    const panel = this.container?.querySelector('#logPanel')
    if (panel) {
      panel.scrollTop = panel.scrollHeight
    }
  }
}
