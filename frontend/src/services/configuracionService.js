import api from './api'

export const configuracionService = {
  obtener:     ()     => api.get('/configuracion/'),
  actualizar:  (data) => api.put('/configuracion/', data),
  subirArchivo:(file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
