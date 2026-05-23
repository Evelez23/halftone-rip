export interface JobListOptions {
  jobs?: unknown[]
}

export class JobList {
  private container: HTMLElement | null = null
  private options: JobListOptions

  constructor(options: JobListOptions = {}) {
    this.options = options
  }

  mount(element: HTMLElement): void {
    this.container = element
    this.render()
  }

  private render(): void {
    if (!this.container) return

    const jobs = (this.options.jobs || []) as Array<{
      id: string
      fileName: string
      status: string
      preset: string
      createdAt: string
      durationMs?: number
      outputPath?: string
      error?: string
    }>

    if (jobs.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-text">
            No hay jobs activos. Arrastra un archivo o haz doble click en un .ps/.pdf para comenzar.
          </div>
        </div>
      `
      return
    }

    this.container.innerHTML = `
      <div class="job-list">
        ${jobs.map(job => {
          const statusClass = `status-${job.status}`
          const statusText = {
            queued: 'Encolado',
            processing: 'Procesando...',
            completed: 'Completado',
            error: 'Error'
          }[job.status] || job.status

          const progress = job.status === 'processing' ? 50 : job.status === 'completed' ? 100 : 0
          const time = job.durationMs ? `(${Math.round(job.durationMs / 1000)}s)` : ''

          return `
            <div class="job-item" data-job-id="${job.id}">
              <div class="job-header">
                <div class="job-name">${job.fileName}</div>
                <span class="job-status ${statusClass}">${statusText}</span>
              </div>
              <div class="job-meta">
                ${job.preset} · ${new Date(job.createdAt).toLocaleTimeString()} ${time}
                ${job.error ? `<br><span style="color:var(--error)">${job.error}</span>` : ''}
                ${job.outputPath ? `
                  <br>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                    <span style="color:var(--success)">✓ ${job.outputPath.split(/[\\\/]/).pop()}</span>
                    <button class="btn-icon btn-open-file" data-path="${job.outputPath.replace(/"/g, '&quot;')}" title="Mostrar archivo en el explorador" style="padding: 2px 6px; font-size: 0.65rem; cursor: pointer;">📂 Mostrar</button>
                  </div>
                ` : ''}
              </div>
              ${job.status === 'processing' ? `
                <div class="job-progress">
                  <div class="job-progress-fill" style="width:${progress}%"></div>
                </div>
              ` : ''}
            </div>
          `
        }).join('')}
      </div>
    `
  }
}
