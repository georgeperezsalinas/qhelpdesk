import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
// import { AllEnterpriseModule } from 'ag-grid-enterprise'
// import { LicenseManager }     from 'ag-grid-enterprise'
// LicenseManager.setLicenseKey('TU_CLAVE_ENTERPRISE_AQUI')

ModuleRegistry.registerModules([AllCommunityModule])
export { themeQuartz } from 'ag-grid-community'

export const AG_THEME_CLASS = 'ag-theme-quartz'

export const defaultGridOptions = {
  animateRows:              true,
  pagination:               true,
  paginationPageSize:       20,
  paginationPageSizeSelector: [10, 20, 50, 100],
  rowSelection:             'multiple',
  suppressRowClickSelection: true,
  enableCellTextSelection:  true,
  tooltipShowDelay:         300,
  suppressMovableColumns:   false,
  suppressColumnVirtualisation: false,
  defaultColDef: {
    sortable:       true,
    resizable:      true,
    filter:         true,
    minWidth:       80,
  },
  localeText: {
    page: 'Página', more: 'Más', to: 'de', of: 'de',
    next: 'Siguiente', last: 'Último', first: 'Primero', previous: 'Anterior',
    loadingOoo: 'Cargando...', noRowsToShow: 'Sin registros',
    filterOoo: 'Filtrar...', applyFilter: 'Aplicar',
    equals: 'Igual a', notEqual: 'Diferente de',
    lessThan: 'Menor que', greaterThan: 'Mayor que',
    contains: 'Contiene', notContains: 'No contiene',
    startsWith: 'Empieza con', endsWith: 'Termina con',
    andCondition: 'Y', orCondition: 'O',
    columns: 'Columnas', filters: 'Filtros',
    rowGroupColumns: 'Agrupar por',
    rowGroupColumnsEmptyMessage: 'Arrastra columnas aquí para agrupar',
    group: 'Grupo', pinColumn: 'Fijar columna',
    pinLeft: 'Fijar izquierda', pinRight: 'Fijar derecha', noPin: 'Sin fijar',
    autosizeThiscolumn: 'Ajustar esta columna',
    autosizeAllColumns: 'Ajustar todas las columnas',
    resetColumns: 'Restablecer columnas',
    copy: 'Copiar', copyWithHeaders: 'Copiar con encabezados',
    export: 'Exportar', csvExport: 'Exportar a CSV',
    excelExport: 'Exportar a Excel',
    selectAll: 'Seleccionar todo', deselect: 'Deseleccionar',
    sum: 'Suma', min: 'Mínimo', max: 'Máximo',
    average: 'Promedio', count: 'Cantidad', blanks: '(Vacíos)',
  },
}

// Renderer: badge de prioridad con punto de color
export function PrioridadBadge(prioridad) {
  const MAP = {
    critica: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444', label: '● Crítica'  },
    alta:    { bg: '#fff7ed', color: '#c2410c', dot: '#f59e0b', label: '● Alta'     },
    media:   { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6', label: '● Media'    },
    baja:    { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: '● Baja'     },
  }
  const c = MAP[prioridad] || MAP.media
  const el = document.createElement('span')
  el.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:${c.bg};color:${c.color}`
  el.textContent = c.label
  return el
}

// Renderer: badge de estado
export function EstadoBadge(estado) {
  const MAP = {
    abierto:     { bg: '#f1f5f9', color: '#475569' },
    asignado:    { bg: '#eff6ff', color: '#1d4ed8' },
    en_progreso: { bg: '#faf5ff', color: '#7e22ce' },
    pendiente:   { bg: '#fff7ed', color: '#c2410c' },
    escalado:    { bg: '#fef3c7', color: '#92400e' },
    resuelto:    { bg: '#f0fdf4', color: '#15803d' },
    cerrado:     { bg: '#f8fafc', color: '#64748b' },
    cancelado:   { bg: '#fef2f2', color: '#b91c1c' },
  }
  const c = MAP[estado] || MAP.abierto
  const label = estado?.replace(/_/g,' ').replace(/^\w/, l => l.toUpperCase())
  const el = document.createElement('span')
  el.style.cssText = `display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:${c.bg};color:${c.color}`
  el.textContent = label
  return el
}
