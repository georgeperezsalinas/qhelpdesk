import api from './api'

export const mantenimientoService = {
  dashboard:           ()         => api.get('/mantenimiento/dashboard'),
  listar:              (params)   => api.get('/mantenimiento/', { params }),
  obtener:             (id)       => api.get(`/mantenimiento/${id}`),
  crear:               (data)     => api.post('/mantenimiento/', data),
  actualizar:          (id, data) => api.patch(`/mantenimiento/${id}`, data),
  actualizarChecklist: (id, itemId, completado, observacion) =>
    api.patch(`/mantenimiento/${id}/checklist/${itemId}`, null, {
      params: { completado, observacion }
    }),
  cronogramas:         ()         => api.get('/mantenimiento/cronogramas'),
  generarPreventivos:  ()         => api.post('/mantenimiento/generar-preventivos'),
}

export const TIPOS_MANTENIMIENTO = [
  { value: 'preventivo', label: 'Preventivo', color: 'blue'  },
  { value: 'correctivo', label: 'Correctivo', color: 'orange'},
]

export const ESTADOS_ORDEN = [
  { value: 'programado',  label: 'Programado',  color: 'default'    },
  { value: 'en_proceso',  label: 'En proceso',  color: 'processing' },
  { value: 'completado',  label: 'Completado',  color: 'success'    },
  { value: 'cancelado',   label: 'Cancelado',   color: 'error'      },
  { value: 'postergado',  label: 'Postergado',  color: 'warning'    },
]

export const getTipo   = (v) => TIPOS_MANTENIMIENTO.find(t => t.value === v)
export const getEstado = (v) => ESTADOS_ORDEN.find(e => e.value === v)
