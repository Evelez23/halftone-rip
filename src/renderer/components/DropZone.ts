export interface DropZoneOptions {
  onFileSelect?: (filePath: string) => void
  onFileDrop?: (filePath: string) => void
}

export class DropZone {
  private container: HTMLElement | null = null
  private options: DropZoneOptions

  constructor(options: DropZoneOptions = {}) {
    this.options = options
  }

  mount(element: HTMLElement): void {
    this.container = element
    this.render()
    this.attachListeners()
  }

  private render(): void {
    if (!this.container) return
    this.container.innerHTML = `
      <div class="drop-zone" id="dropZone">
        <div class="drop-zone-icon">📁</div>
        <div class="drop-zone-text">Arrastra PDF, PS o EPS aquí</div>
        <div class="drop-zone-hint">o haz clic para seleccionar</div>
        <input type="file" id="fileInput" accept=".pdf,.ps,.eps" style="display:none">
      </div>
    `
  }

  private attachListeners(): void {
    const dropZone = this.container?.querySelector('#dropZone') as HTMLElement
    const fileInput = this.container?.querySelector('#fileInput') as HTMLInputElement
    if (!dropZone || !fileInput) return

    // Click para abrir selector
    dropZone.addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        // En Electron, usamos la API para abrir diálogo nativo
        window.electronAPI.openFile().then(result => {
          if (!result.canceled && result.filePath) {
            this.options.onFileSelect?.(result.filePath)
          }
        })
      }
    })

    // Drag & drop nativo del sistema
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.classList.add('drag')
    })
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag')
    })
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('drag')

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        // En Electron, los archivos del drop tienen path
        const file = files[0] as unknown as { path: string }
        if (file.path) {
          this.options.onFileDrop?.(file.path)
        }
      }
    })
  }
}
