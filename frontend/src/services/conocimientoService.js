import api from './api'

export const CATEGORIAS_KB = [
  { value: 'hardware',      label: 'Hardware' },
  { value: 'software',      label: 'Software' },
  { value: 'red',           label: 'Red' },
  { value: 'acceso',        label: 'Acceso' },
  { value: 'vpn',           label: 'VPN' },
  { value: 'correo',        label: 'Correo' },
  { value: 'impresora',     label: 'Impresora' },
  { value: 'telefonia',     label: 'Telefonía' },
  { value: 'servidor',      label: 'Servidor' },
  { value: 'seguridad',     label: 'Seguridad' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro',          label: 'Otro' },
]

export const ESTADOS_ARTICULO = [
  { value: 'borrador',   label: 'Borrador',  color: 'default' },
  { value: 'publicado',  label: 'Publicado', color: 'success' },
  { value: 'archivado',  label: 'Archivado', color: 'warning' },
]

export const conocimientoService = {
  // Portal (solo publicados)
  listar:     (params) => api.get('/conocimiento/', { params }),
  categorias: ()       => api.get('/conocimiento/categorias'),
  obtener:    (id)     => api.get(`/conocimiento/${id}`),
  marcarUtil: (id, util) => api.post(`/conocimiento/${id}/util`, null, { params: { util } }),

  // Admin (todos los estados)
  listarAdmin: (params) => api.get('/conocimiento/admin/todos', { params }),
  crear:       (data)   => api.post('/conocimiento/', data),
  actualizar:  (id, data) => api.patch(`/conocimiento/${id}`, data),
  eliminar:    (id)     => api.delete(`/conocimiento/${id}`),
}
