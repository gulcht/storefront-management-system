import { create } from 'zustand'
import { authFetch } from './authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export interface Category {
  id: number
  name: string
  slug: string
}

export interface Product {
  id: number
  seller: {
    id: number
    username: string
  }
  categories: Category[]
  title: string
  description: string
  price: string
  quantity: number
  image: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ProductState {
  products: Product[]
  categories: Category[]
  loading: boolean
  error: string | null
  fetchProducts: (params?: Record<string, string>) => Promise<void>
  fetchCategories: () => Promise<void>
  createProduct: (formData: FormData) => Promise<boolean>
  updateProduct: (id: number, formData: FormData) => Promise<boolean>
  deleteProduct: (id: number) => Promise<boolean>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  loading: false,
  error: null,

  fetchProducts: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams(params).toString()
      const url = `${API_BASE}/products/${query ? `?${query}` : ''}`
      
      // Fetch products. Can be public or authenticated, let's use normal fetch first
      const access = localStorage.getItem('access_token')
      const headers: Record<string, string> = {}
      if (access) {
        headers['Authorization'] = `Bearer ${access}`
      }
      
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      set({ products: data })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ loading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const res = await fetch(`${API_BASE}/products/categories/`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      set({ categories: data })
    } catch (err) {
      console.error(err)
    }
  },

  createProduct: async (formData) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/products/`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || JSON.stringify(errData) || 'Failed to create product')
      }
      await get().fetchProducts()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
      return false
    } finally {
      set({ loading: false })
    }
  },

  updateProduct: async (id, formData) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/products/${id}/`, {
        method: 'PUT',
        body: formData
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || JSON.stringify(errData) || 'Failed to update product')
      }
      await get().fetchProducts()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
      return false
    } finally {
      set({ loading: false })
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await authFetch(`${API_BASE}/products/${id}/`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete product')
      await get().fetchProducts()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
      return false
    } finally {
      set({ loading: false })
    }
  }
}))
