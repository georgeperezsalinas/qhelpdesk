import api from './api'

export const backupService = {
  dashboard:        ()           => api.get('/backup/dashboard'),
  listarPoliticas:  (params)     => api.get('/backup/politicas', { params }),
  crearPolitica:    (data)       => api.post('/backup/politicas', data),
  actualizarPolitica:(id, data)  => api.patch(`/backup/politicas/${id}`, data),
  listarEjecuciones:(params)     => api.get('/backup/ejecuciones', { params }),
  verificar:        (id, data)   => api.post(`/backup/ejecuciones/${id}/verificar`, data),
}

export const ESTADOS_BACKUP = [
  { value: 'exitoso',   label: 'Exitoso',   color: 'success'    },
  { value: 'fallido',   label: 'Fallido',   color: 'error'      },
  { value: 'parcial',   label: 'Parcial',   color: 'warning'    },
  { value: 'corriendo', label: 'Corriendo', color: 'processing' },
  { value: 'cancelado', label: 'Cancelado', color: 'default'    },
]

export const TIPOS_BACKUP = [
  { value: 'full',        label: 'Full'         },
  { value: 'incremental', label: 'Incremental'  },
  { value: 'diferencial', label: 'Diferencial'  },
]

export const FRECUENCIAS = [
  { value: 'diario',   label: 'Diario'   },
  { value: 'semanal',  label: 'Semanal'  },
  { value: 'mensual',  label: 'Mensual'  },
]

export const getEstado = (v) => ESTADOS_BACKUP.find(e => e.value === v)
