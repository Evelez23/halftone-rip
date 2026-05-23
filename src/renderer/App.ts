import { DropZone } from './components/DropZone'
import { PresetSelector } from './components/PresetSelector'
import { JobList } from './components/JobList'
import { LogViewer } from './components/LogViewer'

export class App {
  private container: HTMLElement | null = null
  private currentFile: { path: string; name: string; ext: string } | null = null
  private selectedPreset = 'standard-plastisol'
  private jobs: unknown[] = []
  private presets: Array<{ id: string; name: string; description: string; category: string }> = []
  private gsVersion: string | null = null
  private unsubscribeJobUpdate: (() => void) | null = null
  private unsubscribeLog: (() => void) | null = null

  async mount(element: HTMLElement): Promise<void> {
    this.container = element
    this.renderSkeleton()

    // Cargar datos iniciales
    await this.loadPresets()
    await this.loadJobs()
    await this.checkGhostscript()

    // Suscribirse a eventos en tiempo real
    this.unsubscribeJobUpdate = window.electronAPI.onJobUpdate((job) => {
      this.updateJob(job)
    })

    this.unsubscribeLog = window.electronAPI.onLogEntry((entry) => {
      this.addLogEntry(entry as { timestamp: string; level: string; stage: string; message: string })
    })

    // Escuchar archivo abierto por doble-click/asociación
    window.electronAPI.on('app:open-file', (_, filePath: string) => {
      this.handleFile(filePath)
    })
  }

  destroy(): void {
    this.unsubscribeJobUpdate?.()
    this.unsubscribeLog?.()
  }

  private renderSkeleton(): void {
    if (!this.container) return

    this.container.innerHTML = `
      <header class="header">
        <div class="logo">
          <span class="cmyk-dots">
            <span class="dot dot-c"></span><span class="dot dot-m"></span>
            <span class="dot dot-y"></span><span class="dot dot-k"></span>
          </span>
          Halftone RIP Pro
        </div>
        <div class="header-actions">
          <span class="gs-status" id="gsStatus">Detectando Ghostscript...</span>
          <button class="btn-icon" id="btnOutput" title="Abrir carpeta de salida">📁 Salida</button>
          <button class="btn-icon" id="btnLogs" title="Abrir carpeta de logs">📋 Logs</button>
          <button class="btn-icon" id="btnTheme" title="Cambiar tema">🌙</button>
        </div>
      </header>
      <div class="main-layout">
        <div class="panel" id="leftPanel">
          <div class="panel-title">📄 Archivo</div>
          <div id="dropZoneContainer"></div>
          <div id="fileInfoContainer"></div>

          <div class="panel-title" style="margin-top:1.5rem">⚙️ Preset</div>
          <div id="presetContainer"></div>

          <button class="btn-process" id="processBtn" disabled>🎯 Procesar Separaciones</button>
        </div>

        <div class="panel" id="centerPanel">
          <div class="panel-title">📋 Jobs</div>
          <div id="jobListContainer"></div>
        </div>

        <div class="panel" id="rightPanel">
          <div class="panel-title">📡 Hotfolder</div>
          <div id="watcherContainer"></div>

          <div class="panel-title" style="margin-top:1.5rem">📜 Logs</div>
          <div id="logContainer"></div>
        </div>
      </div>
    `

    // Inicializar componentes
    const dropZone = new DropZone({
      onFileSelect: (filePath) => this.handleFile(filePath),
      onFileDrop: (filePath) => this.handleFile(filePath)
    })
    dropZone.mount(document.getElementById('dropZoneContainer')!)

    const presetSelector = new PresetSelector({
      onSelect: (presetId) => { this.selectedPreset = presetId }
    })
    presetSelector.mount(document.getElementById('presetContainer')!)

    const jobList = new JobList()
    jobList.mount(document.getElementById('jobListContainer')!)

    const logViewer = new LogViewer()
    logViewer.mount(document.getElementById('logContainer')!)

    // Event listeners
    document.getElementById('processBtn')?.addEventListener('click', () => this.startJob())
    document.getElementById('btnOutput')?.addEventListener('click', () => window.electronAPI.openOutputFolder())
    document.getElementById('btnLogs')?.addEventListener('click', () => window.electronAPI.openLogsFolder())
    document.getElementById('btnTheme')?.addEventListener('click', () => this.toggleTheme())

    // Delegación de eventos para abrir archivos completados en el explorador
    document.getElementById('jobListContainer')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('btn-open-file')) {
        const filePath = target.getAttribute('data-path')
        if (filePath) {
          window.electronAPI.showItemInFolder(filePath)
        }
      }
    })

    // Watcher UI
    this.renderWatcherUI()
  }

  private async loadPresets(): Promise<void> {
    try {
      this.presets = await window.electronAPI.getPresets() as Array<{ id: string; name: string; description: string; category: string }>
      const presetSelector = new PresetSelector({
        presets: this.presets,
        selectedId: this.selectedPreset,
        onSelect: (presetId) => { this.selectedPreset = presetId }
      })
      presetSelector.mount(document.getElementById('presetContainer')!)
    } catch (e) {
      console.error('Error cargando presets:', e)
    }
  }

  private async loadJobs(): Promise<void> {
    try {
      this.jobs = await window.electronAPI.getJobs()
      this.updateJobList()
    } catch (e) {
      console.error('Error cargando jobs:', e)
    }
  }

  private async checkGhostscript(): Promise<void> {
    try {
      this.gsVersion = await window.electronAPI.getGsVersion()
      const statusEl = document.getElementById('gsStatus')
      if (statusEl) {
        if (this.gsVersion) {
          statusEl.textContent = `✓ GS ${this.gsVersion}`
          statusEl.className = 'gs-status ok'
        } else {
          statusEl.textContent = '✗ GS no detectado'
          statusEl.className = 'gs-status error'
        }
      }
    } catch (e) {
      console.error('Error verificando GS:', e)
    }
  }

  private handleFile(filePath: string): void {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const name = filePath.split(/[\/]/).pop() || 'unknown'

    if (!['ps', 'eps', 'pdf'].includes(ext)) {
      alert('Formato no soportado. Usa PDF, PS o EPS.')
      return
    }

    this.currentFile = { path: filePath, name, ext }
    this.renderFileInfo()

    const btn = document.getElementById('processBtn') as HTMLButtonElement
    if (btn) btn.disabled = false
  }

  private renderFileInfo(): void {
    const container = document.getElementById('fileInfoContainer')
    if (!container || !this.currentFile) return

    const badgeClass = this.currentFile.ext === 'pdf' ? 'badge-pdf' : 
                       this.currentFile.ext === 'ps' ? 'badge-ps' : 'badge-eps'

    container.innerHTML = `
      <div class="file-info">
        <div class="file-info-name">
          ${this.currentFile.name}
          <span class="badge ${badgeClass}">${this.currentFile.ext.toUpperCase()}</span>
        </div>
        <div class="file-info-meta">${this.currentFile.path}</div>
      </div>
    `
  }

  private async startJob(): Promise<void> {
    if (!this.currentFile) return

    const btn = document.getElementById('processBtn') as HTMLButtonElement
    if (btn) {
      btn.disabled = true
      btn.textContent = '⏳ Encolando...'
      btn.classList.add('processing')
    }

    try {
      const result = await window.electronAPI.startJob(
        this.currentFile.path,
        this.selectedPreset
      )

      if (result.success) {
        this.currentFile = null
        const infoContainer = document.getElementById('fileInfoContainer')
        if (infoContainer) infoContainer.innerHTML = ''
      } else {
        alert('Error: ' + (result.error || 'Desconocido'))
      }
    } catch (e) {
      alert('Error iniciando job: ' + (e as Error).message)
    } finally {
      if (btn) {
        btn.disabled = !this.currentFile
        btn.textContent = '🎯 Procesar Separaciones'
        btn.classList.remove('processing')
      }
    }
  }

  private updateJob(job: unknown): void {
    const jobData = job as { id: string }
    const idx = this.jobs.findIndex((j: unknown) => (j as { id: string }).id === jobData.id)
    if (idx >= 0) {
      this.jobs[idx] = job
    } else {
      this.jobs.unshift(job)
    }
    this.updateJobList()
  }

  private updateJobList(): void {
    const container = document.getElementById('jobListContainer')
    if (!container) return

    if (this.jobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-text">
            Arrastra un archivo o haz doble click en un .ps/.pdf para comenzar.
          </div>
        </div>
      `
      return
    }

    const jobList = new JobList({ jobs: this.jobs })
    jobList.mount(container)
  }

  private addLogEntry(entry: { timestamp: string; level: string; stage: string; message: string }): void {
    const container = document.getElementById('logContainer')
    if (!container) return

    // Re-renderizar log viewer con nueva entrada
    const logViewer = new LogViewer()
    logViewer.mount(container)
    logViewer.addEntry(entry)
  }

  private renderWatcherUI(): void {
    const container = document.getElementById('watcherContainer')
    if (!container) return

    container.innerHTML = `
      <div class="watcher-config">
        <label class="watcher-row">
          <input type="checkbox" id="watcherToggle">
          <span>Activar hotfolder automático</span>
        </label>
        <div class="watcher-path" id="watcherPath">No configurado</div>
        <button class="btn-icon" id="btnSelectWatcher" style="margin-top:0.5rem;width:100%">
          📁 Seleccionar carpeta
        </button>
      </div>
    `

    document.getElementById('watcherToggle')?.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked
      await window.electronAPI.setWatcherConfig({ enabled })
      if (enabled) {
        await window.electronAPI.toggleWatcher()
      }
    })
  }

  private toggleTheme(): void {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark')
    const btn = document.getElementById('btnTheme')
    if (btn) btn.textContent = isDark ? '🌙' : '☀️'
  }
}
