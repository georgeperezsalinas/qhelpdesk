import api from './api'

export const telefoniaService = {
  dashboard: ()           => api.get('/telefonia/dashboard'),
  listar:    (params)     => api.get('/telefonia/', { params }),
  crear:     (data)       => api.post('/telefonia/', data),
  actualizar:(id, data)   => api.patch(`/telefonia/${id}`, data),
}

export const TIPOS_LINEA = [
  { value: 'fija',    label: 'Fija',    icon: '☎️',  color: 'blue'    },
  { value: 'celular', label: 'Celular', icon: '📱',  color: 'green'   },
  { value: 'voip',    label: 'VoIP',    icon: '🌐',  color: 'purple'  },
  { value: 'fax',     label: 'Fax',     icon: '📠',  color: 'default' },
]

export const getTipo = (v) => TIPOS_LINEA.find(t => t.value === v)

export const formatCurrency = (v) =>
  v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'
