import api from './api'

export const conocimientoService = {
  listar:     (params) => api.get('/conocimiento/', { params }),
  categorias: ()       => api.get('/conocimiento/categorias'),
  obtener:    (id)     => api.get(`/conocimiento/${id}`),
  marcarUtil: (id, util) => api.post(`/conocimiento/${id}/util`, null, { params: { util } }),
}
