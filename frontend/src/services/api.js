import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({ baseURL: '/api/v1' })

// Inyectar access token en cada request
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  )
  failedQueue = []
}

// Refresh automático cuando el access token expira
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const { refreshToken, updateTokens, logout, isExpired } = useAuthStore.getState()

    if (err.response?.status === 401 && !original._retry && refreshToken && isExpired()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/v1/usuarios/refresh', {
          refresh_token: refreshToken,
        })
        updateTokens(data.access_token, data.refresh_token, data.expires_in)
        processQueue(null, data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (err.response?.status === 401) {
      logout()
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

export default api
