import api from './api'

export const infraestructuraService = {
  dashboard:          ()           => api.get('/infraestructura/dashboard'),
  listarServidores:   (params)     => api.get('/infraestructura/servidores', { params }),
  crearServidor:      (data)       => api.post('/infraestructura/servidores', data),
  actualizarServidor: (id, data)   => api.patch(`/infraestructura/servidores/${id}`, data),
  listarDispositivos: (params)     => api.get('/infraestructura/dispositivos', { params }),
  crearDispositivo:   (data)       => api.post('/infraestructura/dispositivos', data),
  actualizarDispositivo:(id, data) => api.patch(`/infraestructura/dispositivos/${id}`, data),
  listarBasesDatos:   (params)     => api.get('/infraestructura/bases-datos', { params }),
}

export const ESTADOS_SERVICIO = [
  { value: 'operativo',     label: 'Operativo',     color: 'success'    },
  { value: 'degradado',     label: 'Degradado',     color: 'warning'    },
  { value: 'fuera',         label: 'Fuera',         color: 'error'      },
  { value: 'mantenimiento', label: 'Mantenimiento', color: 'processing' },
]

export const TIPOS_SERVIDOR = [
  { value: 'fisico',  label: 'Físico'  },
  { value: 'virtual', label: 'Virtual' },
  { value: 'nube',    label: 'Nube'    },
]

export const TIPOS_DISPOSITIVO = [
  { value: 'switch',       label: 'Switch'        },
  { value: 'router',       label: 'Router'        },
  { value: 'firewall',     label: 'Firewall'      },
  { value: 'access_point', label: 'Access Point'  },
  { value: 'vpn',          label: 'VPN'           },
  { value: 'otro',         label: 'Otro'          },
]

export const getEstado = (v) => ESTADOS_SERVICIO.find(e => e.value === v)
