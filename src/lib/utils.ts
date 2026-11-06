import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nombre = (n: number) => n.toLocaleString('fr-FR')

export function duree(secondes: number) {
  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  if (h === 0) return `${m} min`
  return `${nombre(h)} h ${String(m).padStart(2, '0')}`
}

export function distance(metres: number) {
  if (metres < 1000) return `${nombre(metres)} m`
  return `${(metres / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
}

// Dates SQLite "AAAA-MM-JJ HH:MM:SS" (UTC) -> "il y a 3 jours"
export function ilYa(dateSql: string) {
  const date = new Date(dateSql.replace(' ', 'T') + 'Z')
  const s = Math.round((Date.now() - date.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (s < 60) return "à l'instant"
  if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute')
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour')
  if (s < 86400 * 30) return rtf.format(-Math.floor(s / 86400), 'day')
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export function lireStockage(cle: string) {
  try {
    return localStorage.getItem(cle) ?? ''
  } catch {
    return ''
  }
}

export function ecrireStockage(cle: string, valeur: string) {
  try {
    if (valeur) localStorage.setItem(cle, valeur)
    else localStorage.removeItem(cle)
  } catch {
    /* navigation privée : tant pis */
  }
}
