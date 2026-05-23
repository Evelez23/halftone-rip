export interface PresetSelectorOptions {
  presets?: Array<{ id: string; name: string; description: string; category: string }>
  selectedId?: string
  onSelect?: (presetId: string) => void
}

export class PresetSelector {
  private container: HTMLElement | null = null
  private options: PresetSelectorOptions
  private selectedId: string

  constructor(options: PresetSelectorOptions = {}) {
    this.options = options
    this.selectedId = options.selectedId || 'standard-plastisol'
  }

  mount(element: HTMLElement): void {
    this.container = element
    this.render()
    this.attachListeners()
  }

  private render(): void {
    if (!this.container) return

    const presets = this.options.presets || [
      { id: 'standard-plastisol', name: 'Standard Plastisol', description: 'Configuración equilibrada para algodón estándar', category: 'standard' },
      { id: 'fine-detail', name: 'Fine Detail', description: 'Alta lineatura para microdetalles', category: 'standard' },
      { id: 'white-underbase', name: 'White Underbase', description: 'Base blanca optimizada con choke', category: 'underbase' },
      { id: 'athletic-jersey', name: 'Athletic Jersey', description: 'Optimizado para poliéster deportivo', category: 'specialty' },
      { id: 'vintage-print', name: 'Vintage Print', description: 'Efecto desgastado con baja lineatura', category: 'specialty' }
    ]

    const tagClass: Record<string, string> = {
      standard: 'tag-standard',
      underbase: 'tag-underbase',
      specialty: 'tag-specialty'
    }

    const tagName: Record<string, string> = {
      standard: 'Estándar',
      underbase: 'Underbase',
      specialty: 'Especial'
    }

    this.container.innerHTML = `
      <div class="preset-list">
        ${presets.map(p => `
          <div class="preset-item ${p.id === this.selectedId ? 'active' : ''}" data-preset="${p.id}">
            <div class="preset-name">${p.name}</div>
            <div class="preset-desc">${p.description}</div>
            <span class="preset-tag ${tagClass[p.category] || 'tag-standard'}">${tagName[p.category] || p.category}</span>
          </div>
        `).join('')}
      </div>
      <div class="stats" style="margin-top:1rem">
        <div class="stat-box">
          <div class="stat-value" id="statLpi">45</div>
          <div class="stat-label">LPI</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" id="statDpi">300</div>
          <div class="stat-label">DPI</div>
        </div>
      </div>
    `
  }

  private attachListeners(): void {
    const items = this.container?.querySelectorAll('.preset-item')
    items?.forEach(item => {
      item.addEventListener('click', () => {
        const presetId = item.getAttribute('data-preset')
        if (!presetId) return

        // Actualizar visual
        items.forEach(i => i.classList.remove('active'))
        item.classList.add('active')
        this.selectedId = presetId

        // Actualizar stats según preset (hardcodeado por simplicidad)
        const stats: Record<string, { lpi: number; dpi: number }> = {
          'standard-plastisol': { lpi: 45, dpi: 300 },
          'fine-detail': { lpi: 65, dpi: 400 },
          'white-underbase': { lpi: 35, dpi: 300 },
          'athletic-jersey': { lpi: 40, dpi: 300 },
          'vintage-print': { lpi: 35, dpi: 200 }
        }
        const s = stats[presetId] || { lpi: 45, dpi: 300 }
        const lpiEl = document.getElementById('statLpi')
        const dpiEl = document.getElementById('statDpi')
        if (lpiEl) lpiEl.textContent = String(s.lpi)
        if (dpiEl) dpiEl.textContent = String(s.dpi)

        this.options.onSelect?.(presetId)
      })
    })
  }
}
