import { create } from 'zustand'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export interface User {
  id: number
  username: string
  email: string
  role: 'seller' | 'buyer'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User | null) => void
  clearAuth: () => void
  login: (credentials: Record<string, string>) => Promise<boolean>
  register: (data: Record<string, string>) => Promise<boolean>
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Load initial state from localStorage
  const savedAccess = localStorage.getItem('access_token')
  const savedRefresh = localStorage.getItem('refresh_token')
  const savedUser = localStorage.getItem('user')

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    accessToken: savedAccess,
    refreshToken: savedRefresh,
    loading: false,
    error: null,

    setTokens: (access, refresh) => {
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      set({ accessToken: access, refreshToken: refresh })
    },

    setUser: (user) => {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
      set({ user })
    },

    clearAuth: () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      set({ user: null, accessToken: null, refreshToken: null, error: null })
    },

    login: async (credentials) => {
      set({ loading: true, error: null })
      try {
        const res = await fetch(`${API_BASE}/users/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Login failed')
        
        get().setTokens(data.access, data.refresh)
        get().setUser(data.user)
        return true
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
        return false
      } finally {
        set({ loading: false })
      }
    },

    register: async (registerData) => {
      set({ loading: true, error: null })
      try {
        const res = await fetch(`${API_BASE}/users/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerData)
        })
        const data = await res.json()
        if (!res.ok) {
          const detail = data.detail || (data.username ? `Username: ${data.username[0]}` : null) || 'Registration failed'
          throw new Error(detail)
        }
        return true
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
        return false
      } finally {
        set({ loading: false })
      }
    },

    fetchProfile: async () => {
      const { accessToken } = get()
      if (!accessToken) return
      try {
        const res = await fetch(`${API_BASE}/users/profile/`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          get().setUser(data)
        } else {
          // Token expired or invalid
          get().clearAuth()
        }
      } catch {
        get().clearAuth()
      }
    }
  }
})

// Helper to make authenticated requests with token auto-refresh
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const access = localStorage.getItem('access_token')
  const refresh = localStorage.getItem('refresh_token')

  if (!access) {
    throw new Error('Not authenticated')
  }

  // Inject token
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${access}`
  }

  let res = await fetch(url, { ...options, headers })

  // If unauthorized, attempt token refresh
  if (res.status === 401 && refresh) {
    try {
      const refreshRes = await fetch(`${API_BASE}/users/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      })
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        localStorage.setItem('access_token', data.access)
        useAuthStore.getState().setTokens(data.access, refresh)
        
        // Retry original request
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${data.access}`
        }
        res = await fetch(url, { ...options, headers: retryHeaders })
      } else {
        useAuthStore.getState().clearAuth()
      }
    } catch {
      useAuthStore.getState().clearAuth()
    }
  }

  return res
}
