import api from './api'

export const compraService = {
  dashboard: ()           => api.get('/compras/dashboard'),
  listar:    (params)     => api.get('/compras/', { params }),
  obtener:   (id)         => api.get(`/compras/${id}`),
  crear:     (data)       => api.post('/compras/', data),
  actualizar:(id, data)   => api.patch(`/compras/${id}`, data),
  enviar:    (id)         => api.post(`/compras/${id}/enviar`),
  aprobar:   (id, valor)  => api.post(`/compras/${id}/aprobar`, null, { params: { valor_aprobado: valor } }),
  rechazar:  (id, motivo) => api.post(`/compras/${id}/rechazar`, null, { params: { motivo } }),
}

export const ESTADOS_SOLICITUD = [
  { value: 'borrador',      label: 'Borrador',       color: 'default'    },
  { value: 'enviada',       label: 'Enviada',        color: 'processing' },
  { value: 'aprobada',      label: 'Aprobada',       color: 'success'    },
  { value: 'rechazada',     label: 'Rechazada',      color: 'error'      },
  { value: 'en_cotizacion', label: 'En cotización',  color: 'warning'    },
  { value: 'en_proceso',    label: 'En proceso',     color: 'blue'       },
  { value: 'recibida',      label: 'Recibida',       color: 'cyan'       },
  { value: 'cancelada',     label: 'Cancelada',      color: 'default'    },
]

export const TIPOS_SOLICITUD = [
  { value: 'equipo_nuevo',  label: 'Equipo nuevo'   },
  { value: 'repuesto',      label: 'Repuesto'       },
  { value: 'licencia',      label: 'Licencia'       },
  { value: 'servicio',      label: 'Servicio'       },
  { value: 'renovacion',    label: 'Renovación'     },
  { value: 'otro',          label: 'Otro'           },
]

export const formatCurrency = (v) =>
  v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'

export const getEstado = (v) => ESTADOS_SOLICITUD.find(e => e.value === v)
export const getTipo   = (v) => TIPOS_SOLICITUD.find(t => t.value === v)?.label || v
