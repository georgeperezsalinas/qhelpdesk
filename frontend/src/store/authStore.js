import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      expiresAt: null,

      setAuth: (accessToken, refreshToken, usuario, expiresIn) => set({
        accessToken,
        refreshToken,
        usuario,
        expiresAt: Date.now() + expiresIn * 1000,
      }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        usuario: null,
        expiresAt: null,
      }),

      isExpired: () => {
        const { expiresAt } = get()
        if (!expiresAt) return true
        return Date.now() > expiresAt - 60_000   // 1 min de margen
      },

      updateTokens: (accessToken, refreshToken, expiresIn) => set((state) => ({
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        usuario: state.usuario,
      })),

      setUsuario: (usuario) => set({ usuario }),
    }),
    { name: 'qhelpdesk-auth' }
  )
)
