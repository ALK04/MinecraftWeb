import { db } from './db.ts'
import { classements, type StatsJoueur } from './classements.ts'

// Les stats Minecraft sont des totaux depuis toujours. Pour savoir qui a le plus joué
// HIER, on note les stats de chacun une fois par jour (le premier relevé du jour),
// puis on fait la différence entre deux jours.

db.exec(`
  CREATE TABLE IF NOT EXISTS releves (
    jour  TEXT NOT NULL,
    uuid  TEXT NOT NULL,
    stats TEXT NOT NULL,
    PRIMARY KEY (jour, uuid)
  )
`)
const inserer = db.prepare('INSERT OR IGNORE INTO releves (jour, uuid, stats) VALUES (?, ?, ?)')
const lireJour = db.prepare('SELECT uuid, stats FROM releves WHERE jour = ?')

// "AAAA-MM-JJ" à l'heure de Paris
const formatJour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' })
const jour = (decalage = 0) => formatJour.format(new Date(Date.now() + decalage * 86_400_000))

export async function releverStats() {
  const j = jour()
  for (const s of await classements()) inserer.run(j, s.uuid, JSON.stringify(s))
}

type Releve = Map<string, StatsJoueur>
function lire(j: string): Releve {
  const lignes = lireJour.all(j) as { uuid: string; stats: string }[]
  return new Map(lignes.map((l) => [l.uuid, JSON.parse(l.stats) as StatsJoueur]))
}

const CHAMPS = ['tempsDeJeu', 'morts', 'mobsTues', 'joueursTues', 'blocsMines', 'distance', 'sauts'] as const

function difference(fin: StatsJoueur, debut: StatsJoueur | undefined): StatsJoueur {
  const d = { ...fin }
  for (const c of CHAMPS) d[c] = Math.max(0, fin[c] - (debut?.[c] ?? 0))
  return d
}

export type JoueurDuJour = {
  jour: string
  // hier = la journée d'hier ; aujourdhui = depuis ce matin ; total = depuis toujours (pas encore d'historique)
  periode: 'hier' | 'aujourdhui' | 'total'
  star: { periode: StatsJoueur; total: StatsJoueur } | null
  dauphins: StatsJoueur[]
}

async function calculer(): Promise<JoueurDuJour> {
  const actuels = await classements()
  const parUuid: Releve = new Map(actuels.map((s) => [s.uuid, s]))
  const hier = lire(jour(-1))
  const auj = lire(jour())

  const essais: { periode: JoueurDuJour['periode']; debut: Releve; fin: Releve }[] = []
  if (hier.size && auj.size) essais.push({ periode: 'hier', debut: hier, fin: auj })
  if (auj.size) essais.push({ periode: 'aujourdhui', debut: auj, fin: parUuid })

  for (const { periode, debut, fin } of essais) {
    const deltas = [...fin.values()]
      .map((f) => difference(f, debut.get(f.uuid)))
      .filter((d) => d.tempsDeJeu > 0)
      .sort((a, b) => b.tempsDeJeu - a.tempsDeJeu)
    if (deltas.length) {
      const [premier, ...autres] = deltas
      return {
        jour: jour(),
        periode,
        star: { periode: premier, total: parUuid.get(premier.uuid) ?? premier },
        dauphins: autres.slice(0, 2),
      }
    }
  }

  // Pas d'historique (ou personne n'a joué) : la légende de tous les temps
  const tries = [...actuels].sort((a, b) => b.tempsDeJeu - a.tempsDeJeu)
  return {
    jour: jour(),
    periode: 'total',
    star: tries[0] ? { periode: tries[0], total: tries[0] } : null,
    dauphins: tries.slice(1, 3),
  }
}

let cache: { valeur: JoueurDuJour; date: number } | null = null
export async function joueurDuJour(): Promise<JoueurDuJour> {
  if (cache && Date.now() - cache.date < 60_000) return cache.valeur
  const valeur = await calculer()
  cache = { valeur, date: Date.now() }
  return valeur
}
