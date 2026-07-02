import { create } from 'zustand'
import { authFetch } from './authStore'
import type { Product } from './productStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export interface CartItem {
  id: number
  product: Product
  quantity: number
}

export interface Cart {
  id: number
  buyer: number
  items: CartItem[]
  total_price: number
}

interface CartState {
  cart: Cart | null
  loading: boolean
  error: string | null
  fetchCart: () => Promise<void>
  addToCart: (productId: number, quantity: number) => Promise<boolean>
  updateQuantity: (itemId: number, quantity: number) => Promise<boolean>
  removeFromCart: (itemId: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/carts/`)
      if (!res.ok) throw new Error('Failed to fetch cart')
      const data = await res.json()
      set({ cart: data })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ loading: false })
    }
  },

  addToCart: async (productId, quantity) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/carts/items/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to add item to cart')
      await get().fetchCart()
      return true
    } catch (err: any) {
      set({ error: err.message })
      return false
    } finally {
      set({ loading: false })
    }
  },

  updateQuantity: async (itemId, quantity) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/carts/items/${itemId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to update quantity')
      await get().fetchCart()
      return true
    } catch (err: any) {
      set({ error: err.message })
      return false
    } finally {
      set({ loading: false })
    }
  },

  removeFromCart: async (itemId) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/carts/items/${itemId}/`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to remove item')
      await get().fetchCart()
      return true
    } catch (err: any) {
      set({ error: err.message })
      return false
    } finally {
      set({ loading: false })
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/carts/clear/`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to clear cart')
      await get().fetchCart()
      return true
    } catch (err: any) {
      set({ error: err.message })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
