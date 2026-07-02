import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to parse and clean image URLs from backend.
 * If the URL is already absolute (starts with http), it returns it as is.
 * Otherwise, it prepends the backend base URL parsed from environment variable config.
 */
export function getProductImageUrl(imagePath: string | null | undefined): string | undefined {
  if (!imagePath) return undefined
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  // Try to construct base URL from the VITE_API_BASE_URL (removing '/api' suffix)
  const envBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
  const hostBase = envBase.replace(/\/api\/?$/, '')
  return `${hostBase}${imagePath}`
}
