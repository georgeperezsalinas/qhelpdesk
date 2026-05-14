import api from './api'

export const usuarioService = {
  listar:          (params) => api.get('/usuarios/', { params }),
  listarTecnicos:  (params) => api.get('/usuarios/tecnicos', { params }),
  obtener:         (id)     => api.get(`/usuarios/${id}`),
  crear:           (data)   => api.post('/usuarios/', data),
  actualizar:      (id, data) => api.patch(`/usuarios/${id}`, data),
  desactivar:      (id)     => api.delete(`/usuarios/${id}`),
  resetearPassword:(id)     => api.post(`/usuarios/${id}/resetear-password`),
  miPerfil:        ()       => api.get('/usuarios/me'),
  actualizarPerfil:(data)   => api.patch('/usuarios/me', data),
  cambiarPassword: (data)   => api.post('/usuarios/me/cambiar-password', data),
}

export const ROLES = [
  { value: 'jefe',            label: 'Jefe de área',   color: 'purple' },
  { value: 'especialista',    label: 'Especialista',   color: 'blue'   },
  { value: 'mesa_ayuda',      label: 'Mesa de ayuda',  color: 'cyan'   },
  { value: 'alta_direccion',  label: 'Alta Dirección', color: 'red'    },
  { value: 'usuario_final',   label: 'Usuario final',  color: 'default'},
  { value: 'usuario_externo', label: 'Usuario externo',color: 'orange' },
]

export const TURNOS = [
  { value: 'manana', label: 'Mañana'  },
  { value: 'tarde',  label: 'Tarde'   },
  { value: 'noche',  label: 'Noche'   },
]

export const getRolLabel = (rol) => ROLES.find(r => r.value === rol)?.label || rol
export const getRolColor = (rol) => ROLES.find(r => r.value === rol)?.color || 'default'
