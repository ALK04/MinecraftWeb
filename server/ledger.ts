import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { config } from './config.ts'

// =============================================================
//  Analyse du journal Ledger (chaque bloc cassé : qui, quoi, où, quand).
//
//  Pour chaque filon de minerai trouvé, on regarde ce que le joueur a
//  creusé juste avant, autour :
//   - presque rien  -> trouvé « à découvert » (grotte) : normal
//   - des blocs     -> trouvé « en creusant » : on compte combien
//  Un tricheur au X-ray creuse peu et tombe toujours sur des diamants.
//  Un honnête creuse beaucoup de pierre pour un filon.
//  Indice = blocs normaux par filon ÷ blocs creusés par filon (≈1 normal)
// =============================================================

type Casse = { t: number; x: number; y: number; z: number; bloc: string; monde: string; uuid: string; nom: string }

const PIERRES = new Set(['stone', 'deepslate', 'tuff', 'granite', 'diorite', 'andesite', 'calcite', 'dirt', 'gravel'].map((b) => `minecraft:${b}`))
const NETHER = new Set(['netherrack', 'basalt', 'blackstone', 'soul_sand', 'soul_soil', 'magma_block'].map((b) => `minecraft:${b}`))

const MINERAIS = {
  diamant: {
    blocs: new Set(['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore']),
    roche: PIERRES,
    monde: 'minecraft:overworld',
    yMax: 16, // les diamants sont sous y=16 : on ne compte que la roche creusée dans cette zone
    reference: 120, // blocs creusés par filon en minage honnête (approximatif, volontairement large)
  },
  debris: {
    blocs: new Set(['minecraft:ancient_debris']),
    roche: NETHER,
    monde: 'minecraft:the_nether',
    yMax: 30,
    reference: 80,
  },
} as const

export type Filon = {
  type: keyof typeof MINERAIS
  x: number
  y: number
  z: number
  le: string // date ISO
  blocs: number // nombre de blocs de minerai dans le filon
  decouvert: boolean
  creuseAvant: number // blocs de roche creusés autour dans les 5 minutes avant
  chemin: [number, number, number][] // [dx, dz, âge 0..1] des blocs creusés avant (vue de dessus)
}

export type AnalyseMinerai = {
  filons: number
  decouverts: number
  creuses: number
  roche: number // roche creusée dans la zone du minerai
  blocsParFilon: number | null
  indice: number | null // null tant qu'il n'y a pas assez de filons creusés
}

export type AnalyseLedger = {
  uuid: string
  nom: string
  diamant: AnalyseMinerai
  debris: AnalyseMinerai
  derniers: Filon[]
}

const dateDe = (texte: string) => {
  // Exposed/SQLite : "2026-11-06 15:37:34.123" (UTC) ou ISO complet
  const iso = texte.includes('T') ? texte : texte.replace(' ', 'T')
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')
}

const uuidDe = (b: Uint8Array) => {
  const h = Buffer.from(b).toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function lire(): Casse[] {
  const chemin = config.ledgerDb
  if (!chemin || !existsSync(chemin)) return []
  const blocs = [...PIERRES, ...NETHER, ...MINERAIS.diamant.blocs, ...MINERAIS.debris.blocs]
  const db = new DatabaseSync(chemin, { readOnly: true })
  try {
    db.exec('PRAGMA busy_timeout = 3000')
    const lignes = db
      .prepare(
        `SELECT a."time" AS t, a.x, a.y, a.z, o.identifier AS bloc, w.identifier AS monde,
                p.player_id AS pid, p.player_name AS nom
         FROM actions a
         JOIN ActionIdentifiers ai ON ai.id = a.action_id
         JOIN ObjectIdentifiers o ON o.id = a.object_id
         JOIN worlds w ON w.id = a.world_id
         JOIN players p ON p.id = a.player_id
         WHERE ai.action_identifier = 'block-break'
           AND o.identifier IN (${blocs.map(() => '?').join(',')})
         ORDER BY a.id`,
      )
      .all(...blocs) as { t: string; x: number; y: number; z: number; bloc: string; monde: string; pid: Uint8Array; nom: string }[]
    return lignes.map((l) => ({ t: dateDe(l.t), x: l.x, y: l.y, z: l.z, bloc: l.bloc, monde: l.monde, uuid: uuidDe(l.pid), nom: l.nom }))
  } finally {
    db.close()
  }
}

function analyserMinerai(casses: Casse[], type: keyof typeof MINERAIS): { analyse: AnalyseMinerai; filons: Filon[] } {
  const m = MINERAIS[type]
  const ici = casses.filter((c) => c.monde === m.monde)
  const roche = ici.filter((c) => m.roche.has(c.bloc) && c.y <= m.yMax)

  // 1. Regrouper les blocs de minerai en filons (proches dans l'espace et le temps)
  const filons: { casses: Casse[] }[] = []
  for (const c of ici.filter((c) => m.blocs.has(c.bloc))) {
    const dernier = filons.at(-1)?.casses.at(-1)
    const proche =
      dernier &&
      c.t - dernier.t < 120_000 &&
      Math.max(Math.abs(c.x - dernier.x), Math.abs(c.y - dernier.y), Math.abs(c.z - dernier.z)) <= 4
    if (proche) filons.at(-1)!.casses.push(c)
    else filons.push({ casses: [c] })
  }

  // 2. Pour chaque filon : qu'a-t-il creusé autour, juste avant ?
  const resultat: Filon[] = filons.map(({ casses: cs }) => {
    const p = cs[0]
    const avant = roche.filter(
      (r) => r.t < p.t && p.t - r.t <= 5 * 60_000 && Math.abs(r.x - p.x) <= 16 && Math.abs(r.z - p.z) <= 16 && Math.abs(r.y - p.y) <= 8,
    )
    // « À découvert » : quasiment rien creusé tout près dans la minute d'avant
    const toutPres = avant.filter(
      (r) => p.t - r.t <= 60_000 && Math.max(Math.abs(r.x - p.x), Math.abs(r.y - p.y), Math.abs(r.z - p.z)) <= 6,
    )
    const debut = avant[0]?.t ?? p.t
    return {
      type,
      x: p.x,
      y: p.y,
      z: p.z,
      le: new Date(p.t).toISOString(),
      blocs: cs.length,
      decouvert: toutPres.length <= 2,
      creuseAvant: avant.length,
      chemin: avant.slice(-150).map((r) => [r.x - p.x, r.z - p.z, p.t === debut ? 1 : (r.t - debut) / (p.t - debut)]),
    }
  })

  const creuses = resultat.filter((f) => !f.decouvert).length
  const blocsParFilon = creuses > 0 ? Math.round(roche.length / creuses) : null
  // Il faut quelques filons creusés pour juger (un coup de chance ne suffit pas)
  const indice = creuses >= 3 && blocsParFilon !== null ? Math.round((m.reference / Math.max(1, blocsParFilon)) * 100) / 100 : null

  return {
    analyse: { filons: resultat.length, decouverts: resultat.length - creuses, creuses, roche: roche.length, blocsParFilon, indice },
    filons: resultat,
  }
}

export function analyserLedger(): Map<string, AnalyseLedger> {
  const casses = lire()
  const parJoueur = new Map<string, Casse[]>()
  for (const c of casses) {
    if (!parJoueur.has(c.uuid)) parJoueur.set(c.uuid, [])
    parJoueur.get(c.uuid)!.push(c)
  }
  const resultat = new Map<string, AnalyseLedger>()
  for (const [uuid, cs] of parJoueur) {
    const d = analyserMinerai(cs, 'diamant')
    const n = analyserMinerai(cs, 'debris')
    resultat.set(uuid, {
      uuid,
      nom: cs[0].nom,
      diamant: d.analyse,
      debris: n.analyse,
      derniers: [...d.filons, ...n.filons].sort((a, b) => b.le.localeCompare(a.le)).slice(0, 12),
    })
  }
  return resultat
}

export const ledgerActif = () => Boolean(config.ledgerDb && existsSync(config.ledgerDb))
