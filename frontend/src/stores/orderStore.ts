import { create } from 'zustand'
import { authFetch } from './authStore'
import type { Product } from './productStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export interface OrderItem {
  id: number
  product: Product
  quantity: number
  price_at_purchase: string
}

export interface Order {
  id: number
  buyer: number
  items: OrderItem[]
  status: 'pending' | 'completed' | 'cancelled'
  total_price: number
  created_at: string
}

interface OrderState {
  orders: Order[]
  loading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  placeOrder: () => Promise<boolean>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/orders/`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      set({ orders: data })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ loading: false })
    }
  },

  placeOrder: async () => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/orders/`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Order placement failed')
      await get().fetchOrders()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
