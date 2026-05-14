import api from './api'

export const inventarioService = {
  // Dashboard
  dashboard:       ()       => api.get('/inventario/dashboard'),

  // Equipos
  listarEquipos:   (params) => api.get('/inventario/equipos', { params }),
  obtenerEquipo:   (id)     => api.get(`/inventario/equipos/${id}`),
  crearEquipo:     (data)   => api.post('/inventario/equipos', data),
  actualizarEquipo:(id, data) => api.patch(`/inventario/equipos/${id}`, data),
  asignarEquipo:   (id, data) => api.post(`/inventario/equipos/${id}/asignar`, data),
  darDeBaja:       (id, motivo) => api.post(`/inventario/equipos/${id}/baja`, null, { params: { motivo } }),
  historialEquipo: (id)     => api.get(`/inventario/equipos/${id}/historial`),

  // Licencias
  listarLicencias: (params) => api.get('/inventario/licencias', { params }),
  crearLicencia:   (data)   => api.post('/inventario/licencias', data),
  actualizarLicencia: (id, data) => api.patch(`/inventario/licencias/${id}`, data),
}

export const TIPOS_EQUIPO = [
  { value: 'pc_escritorio',  label: 'PC Escritorio', icon: '🖥️'  },
  { value: 'laptop',         label: 'Laptop',        icon: '💻'  },
  { value: 'servidor',       label: 'Servidor',      icon: '🖳'   },
  { value: 'impresora',      label: 'Impresora',     icon: '🖨️'  },
  { value: 'switch',         label: 'Switch',        icon: '🔀'  },
  { value: 'router',         label: 'Router',        icon: '📡'  },
  { value: 'firewall',       label: 'Firewall',      icon: '🛡️'  },
  { value: 'access_point',   label: 'Access Point',  icon: '📶'  },
  { value: 'ups',            label: 'UPS',           icon: '🔋'  },
  { value: 'proyector',      label: 'Proyector',     icon: '📽️'  },
  { value: 'telefono_ip',    label: 'Teléfono IP',   icon: '☎️'  },
  { value: 'celular',        label: 'Celular',       icon: '📱'  },
  { value: 'tablet',         label: 'Tablet',        icon: '📟'  },
  { value: 'scanner',        label: 'Scanner',       icon: '📠'  },
  { value: 'otro',           label: 'Otro',          icon: '📦'  },
]

export const ESTADOS_EQUIPO = [
  { value: 'activo',           label: 'Activo',           color: 'success' },
  { value: 'en_mantenimiento', label: 'En mantenimiento', color: 'warning' },
  { value: 'en_reparacion',    label: 'En reparación',    color: 'processing'},
  { value: 'de_baja',          label: 'De baja',          color: 'error'   },
  { value: 'bodega',           label: 'En bodega',        color: 'default' },
  { value: 'robado_perdido',   label: 'Robado/Perdido',   color: 'error'   },
]

export const TIPOS_LICENCIA = [
  { value: 'volumen',     label: 'Volumen'     },
  { value: 'OEM',         label: 'OEM'         },
  { value: 'suscripcion', label: 'Suscripción' },
  { value: 'open_source', label: 'Open Source' },
  { value: 'otro',        label: 'Otro'        },
]

export const getTipoEquipo   = (v) => TIPOS_EQUIPO.find(t => t.value === v)
export const getEstadoEquipo = (v) => ESTADOS_EQUIPO.find(e => e.value === v)

export const formatCurrency = (v) =>
  v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'
