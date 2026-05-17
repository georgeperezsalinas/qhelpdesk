import api from './api'

export const ticketService = {
  listar:             (params) => api.get('/tickets/', { params }),
  obtener:            (id)     => api.get(`/tickets/${id}`),
  crear:              (data)   => api.post('/tickets/', data),
  actualizar:         (id, data) => api.patch(`/tickets/${id}`, data),
  dashboard:          ()       => api.get('/tickets/dashboard'),
  slaCompliance:      (dias = 30)    => api.get('/tickets/sla-compliance', { params: { dias } }),
  metricasTecnico:    (dias = 30)    => api.get('/tickets/metricas-tecnico', { params: { dias } }),
  tendenciaSemanal:   (semanas = 8)  => api.get('/tickets/tendencia-semanal', { params: { semanas } }),
  comentarios:        (id)     => api.get(`/tickets/${id}/comentarios`),
  agregarComentario:  (id, data) => api.post(`/tickets/${id}/comentarios`, data),
  calificar:          (id, data) => api.post(`/tickets/${id}/nps`, data),
  tomar:              (id)     => api.post(`/tickets/${id}/tomar`),
  escalar:            (id, tecnico_nivel2_id) =>
                        api.post(`/tickets/${id}/escalar`, null, { params: { tecnico_nivel2_id } }),
  cerrar:             (id)     => api.post(`/tickets/${id}/cerrar`),
}

export const PRIORIDADES = [
  { value: 'critica', label: 'Crítica', color: '#ff4d4f', bg: '#fff1f0' },
  { value: 'alta',    label: 'Alta',    color: '#fa8c16', bg: '#fff7e6' },
  { value: 'media',   label: 'Media',   color: '#1677ff', bg: '#e6f4ff' },
  { value: 'baja',    label: 'Baja',    color: '#52c41a', bg: '#f6ffed' },
]

export const ESTADOS = [
  { value: 'abierto',     label: 'Abierto',      color: 'default'  },
  { value: 'asignado',    label: 'Asignado',     color: 'blue'     },
  { value: 'en_progreso', label: 'En progreso',  color: 'processing'},
  { value: 'pendiente',   label: 'Pendiente',    color: 'warning'  },
  { value: 'escalado',    label: 'Escalado',     color: 'volcano'  },
  { value: 'resuelto',    label: 'Resuelto',     color: 'success'  },
  { value: 'cerrado',     label: 'Cerrado',      color: 'default'  },
  { value: 'cancelado',   label: 'Cancelado',    color: 'error'    },
]

export const CATEGORIAS = [
  { value: 'hardware',      label: 'Hardware'      },
  { value: 'software',      label: 'Software'      },
  { value: 'red',           label: 'Red'           },
  { value: 'acceso',        label: 'Acceso'        },
  { value: 'vpn',           label: 'VPN'           },
  { value: 'correo',        label: 'Correo'        },
  { value: 'impresora',     label: 'Impresora'     },
  { value: 'telefonia',     label: 'Telefonía'     },
  { value: 'servidor',      label: 'Servidor'      },
  { value: 'seguridad',     label: 'Seguridad'     },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro',          label: 'Otro'          },
]

export const CANALES = [
  { value: 'portal',   label: 'Portal web'  },
  { value: 'correo',   label: 'Correo'      },
  { value: 'whatsapp', label: 'WhatsApp'    },
  { value: 'llamada',  label: 'Llamada'     },
  { value: 'sistema',  label: 'Sistema'     },
]

export const getPrioridad   = (v) => PRIORIDADES.find(p => p.value === v)
export const getEstado      = (v) => ESTADOS.find(e => e.value === v)
export const getCategoria   = (v) => CATEGORIAS.find(c => c.value === v)?.label || v
