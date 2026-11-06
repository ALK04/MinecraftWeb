import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.ts'

export type Joueur = { uuid: string; nom: string }

// Minecraft garde dans usercache.json tous les joueurs déjà venus sur le serveur.
export async function lireJoueurs(): Promise<Joueur[]> {
  try {
    const brut = await readFile(path.join(config.mcData, 'usercache.json'), 'utf8')
    const liste = JSON.parse(brut) as { name: string; uuid: string }[]
    return liste
      .map((j) => ({ uuid: j.uuid, nom: j.name }))
      .sort((a, b) => a.nom.localeCompare(b.nom))
  } catch {
    return []
  }
}
