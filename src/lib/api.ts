import { useCallback, useEffect, useState } from 'react'

export type Joueur = { uuid: string; nom: string }

export type Statut = {
  etat: 'en_ligne' | 'veille'
  joueurs: Joueur[]
}

export type StatsJoueur = {
  uuid: string
  nom: string
  tempsDeJeu: number
  morts: number
  mobsTues: number
  joueursTues: number
  blocsMines: number
  distance: number
  sauts: number
}

export type EtatObjectif = 'a_faire' | 'en_cours' | 'fait'

export type Objectif = {
  id: number
  titre: string
  description: string
  categorie: string
  pour: string | null
  statut: EtatObjectif
  cree_par: string
  pris_par: string | null
  fait_par: string | null
  cree_le: string
  fait_le: string | null
}

export type ReponseObjectifs = { objectifs: Objectif[]; codeRequis: boolean }

export class ErreurApi extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let rep: Response
  try {
    rep = await fetch(url, init)
  } catch {
    throw new ErreurApi('Impossible de joindre le site', 0)
  }
  if (!rep.ok) {
    const corps = (await rep.json().catch(() => ({}))) as { erreur?: string }
    throw new ErreurApi(corps.erreur ?? `Erreur ${rep.status}`, rep.status)
  }
  if (rep.status === 204) return undefined as T
  return (await rep.json()) as T
}

// Charge une adresse de l'API, et la recharge toutes les `intervalle` ms si demandé.
export function useApi<T>(url: string, intervalle?: number) {
  const [data, setData] = useState<T | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      setData(await api<T>(url))
      setErreur(null)
    } catch (e) {
      setErreur((e as Error).message)
    }
  }, [url])

  useEffect(() => {
    void recharger()
    if (!intervalle) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void recharger()
    }, intervalle)
    return () => clearInterval(id)
  }, [recharger, intervalle])

  return { data, erreur, recharger }
}
