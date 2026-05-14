/**
 * useNotifications.js
 * Hook que mantiene la conexión WebSocket y gestiona las notificaciones
 * en tiempo real para el usuario autenticado.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { notification as antNotif } from 'antd'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

// Ícono y color por tipo de notificación
const TIPO_CONFIG = {
  ticket_nuevo:         { type: 'info',    icon: '🎫' },
  ticket_asignado:      { type: 'info',    icon: '👤' },
  ticket_actualizado:   { type: 'info',    icon: '💬' },
  ticket_resuelto:      { type: 'success', icon: '✅' },
  sla_por_vencer:       { type: 'warning', icon: '⚠️'  },
  sla_vencido:          { type: 'error',   icon: '❌' },
  licencia_por_vencer:  { type: 'warning', icon: '📋' },
  mantenimiento_prog:   { type: 'info',    icon: '🔧' },
  backup_fallido:       { type: 'error',   icon: '💾' },
  contrato_por_vencer:  { type: 'warning', icon: '📄' },
  sistema:              { type: 'info',    icon: '🔔' },
}

export function useNotifications() {
  const { accessToken } = useAuthStore()
  const [notificaciones, setNotificaciones] = useState([])
  const [noLeidas,       setNoLeidas]       = useState(0)
  const [conectado,      setConectado]      = useState(false)
  const wsRef       = useRef(null)
  const reconnectRef = useRef(null)
  const mountedRef   = useRef(true)

  // Mostrar toast según tipo
  const mostrarToast = useCallback((notif) => {
    const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.sistema
    antNotif[cfg.type]({
      message:     `${cfg.icon} ${notif.titulo}`,
      description: notif.mensaje,
      placement:   'topRight',
      duration:    6,
      onClick:     notif.url ? () => window.location.href = notif.url : undefined,
    })
  }, [])

  const agregarNotificacion = useCallback((notif) => {
    setNotificaciones(prev => {
      const existe = prev.find(n => n.id === notif.id)
      if (existe) return prev
      return [notif, ...prev].slice(0, 50)
    })
    if (!notif.leida) setNoLeidas(n => n + 1)
  }, [])

  // Conectar WebSocket
  const conectar = useCallback(() => {
    if (!accessToken || !mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/api/v1/notificaciones/ws/${accessToken}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConectado(true)
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(event.data)

        if (msg.event === 'ping') {
          ws.send(JSON.stringify({ action: 'pong' }))
          return
        }

        if (msg.event === 'notificaciones_pendientes') {
          setNotificaciones(msg.items || [])
          setNoLeidas(msg.total || 0)
          return
        }

        if (msg.event === 'notificacion') {
          agregarNotificacion(msg)
          mostrarToast(msg)
          return
        }

        if (msg.event === 'leida_confirmada') {
          setNotificaciones(prev =>
            prev.map(n => n.id === msg.id ? { ...n, leida: true } : n)
          )
          setNoLeidas(n => Math.max(0, n - 1))
          return
        }

        if (msg.event === 'todas_leidas') {
          setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
          setNoLeidas(0)
          return
        }
      } catch {}
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConectado(false)
      wsRef.current = null
      // Reconectar en 5 segundos
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) conectar()
      }, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [accessToken, agregarNotificacion, mostrarToast])

  useEffect(() => {
    mountedRef.current = true
    if (accessToken) conectar()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [accessToken, conectar])

  // Marcar como leída vía WS
  const marcarLeida = useCallback((id) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'marcar_leida', id }))
    } else {
      api.post(`/notificaciones/${id}/leer`).then(() => {
        setNotificaciones(prev =>
          prev.map(n => n.id === id ? { ...n, leida: true } : n)
        )
        setNoLeidas(n => Math.max(0, n - 1))
      })
    }
  }, [])

  const marcarTodasLeidas = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'marcar_todas_leidas' }))
    } else {
      api.post('/notificaciones/leer-todas').then(() => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
        setNoLeidas(0)
      })
    }
  }, [])

  return {
    notificaciones,
    noLeidas,
    conectado,
    marcarLeida,
    marcarTodasLeidas,
  }
}
