import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.ts'
import { lireJoueurs } from './joueurs.ts'

// Minecraft enregistre les stats de chaque joueur dans <monde>/players/stats/<uuid>.json
// (<monde>/stats/ avant la 26.x), mis à jour à chaque sauvegarde automatique et quand
// le joueur se déconnecte.
export function dossierStats(): string {
  const monde = path.join(config.mcData, config.mcMonde)
  const nouveau = path.join(monde, 'players', 'stats')
  return existsSync(nouveau) ? nouveau : path.join(monde, 'stats')
}

type FichierStats = { stats?: Record<string, Record<string, number>> }

export type StatsJoueur = {
  uuid: string
  nom: string
  tempsDeJeu: number // en secondes
  morts: number
  mobsTues: number
  joueursTues: number
  blocsMines: number
  distance: number // en mètres
  sauts: number
}

const somme = (obj: Record<string, number> | undefined) =>
  Object.values(obj ?? {}).reduce((a, b) => a + b, 0)

function calculer(uuid: string, nom: string, f: FichierStats): StatsJoueur {
  const custom = f.stats?.['minecraft:custom'] ?? {}
  const c = (cle: string) => custom[`minecraft:${cle}`] ?? 0

  // Toutes les distances (marche, sprint, nage, élytres, bateau...) en cm
  const distanceCm = Object.entries(custom)
    .filter(([cle]) => cle.endsWith('_one_cm'))
    .reduce((a, [, v]) => a + v, 0)

  return {
    uuid,
    nom,
    tempsDeJeu: Math.round(c('play_time') / 20), // 20 ticks = 1 seconde
    morts: c('deaths'),
    mobsTues: c('mob_kills'),
    joueursTues: c('player_kills'),
    blocsMines: somme(f.stats?.['minecraft:mined']),
    distance: Math.round(distanceCm / 100),
    sauts: c('jump'),
  }
}

async function lireClassements(): Promise<StatsJoueur[]> {
  const dossier = dossierStats()
  let fichiers: string[]
  try {
    fichiers = (await readdir(dossier)).filter((f) => f.endsWith('.json'))
  } catch {
    return [] // pas encore de stats (aucun joueur venu)
  }

  const noms = new Map((await lireJoueurs()).map((j) => [j.uuid, j.nom]))

  const resultats = await Promise.all(
    fichiers.map(async (fichier) => {
      const uuid = fichier.replace(/\.json$/, '')
      try {
        const f = JSON.parse(await readFile(path.join(dossier, fichier), 'utf8')) as FichierStats
        return calculer(uuid, noms.get(uuid) ?? uuid.slice(0, 8), f)
      } catch {
        return null // fichier en cours d'écriture : on le relira la prochaine fois
      }
    }),
  )
  return resultats.filter((r): r is StatsJoueur => r !== null)
}

let cache: { valeur: StatsJoueur[]; date: number } | null = null

export async function classements(): Promise<StatsJoueur[]> {
  if (cache && Date.now() - cache.date < 60_000) return cache.valeur
  const valeur = await lireClassements()
  cache = { valeur, date: Date.now() }
  return valeur
}
