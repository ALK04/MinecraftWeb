import { config } from './config.ts'

export type Statut = {
  // en_ligne : le serveur tourne
  // veille   : en pause (personne ne joue) ou éteint — se réveille dès qu'on se connecte
  etat: 'en_ligne' | 'veille'
  joueurs: { uuid: string; nom: string }[]
}

// On demande la liste des joueurs à BlueMap plutôt qu'au port Minecraft :
// toucher au port 25565 réveillerait le serveur quand il est en pause.
async function lireStatut(): Promise<Statut> {
  try {
    const rep = await fetch(`${config.bluemapUrl}/maps/${config.mcMonde}/live/players.json`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`)
    const data = (await rep.json()) as { players?: { uuid: string; name: string }[] }
    return {
      etat: 'en_ligne',
      joueurs: (data.players ?? []).map((p) => ({ uuid: p.uuid, nom: p.name })),
    }
  } catch {
    return { etat: 'veille', joueurs: [] }
  }
}

// Petit cache : si 20 personnes ouvrent le site en même temps, une seule requête.
let cache: { valeur: Statut; date: number } | null = null

export async function statut(): Promise<Statut> {
  if (cache && Date.now() - cache.date < 10_000) return cache.valeur
  const valeur = await lireStatut()
  cache = { valeur, date: Date.now() }
  return valeur
}
