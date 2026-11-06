import { Router, type NextFunction, type Request, type Response } from 'express'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.ts'
import { lireJoueurs } from './joueurs.ts'
import { limiteur } from './limite.ts'
import { analyserLedger, ledgerActif, type AnalyseLedger } from './ledger.ts'
import { db } from './db.ts'

// =============================================================
//  Espace admin : détection de X-ray, à partir des statistiques
//  que Minecraft enregistre déjà (aucun plugin, aucun impact sur le jeu).
//
//  Principe : un joueur honnête casse beaucoup de pierre pour trouver
//  un diamant. Avec un X-ray, il creuse droit vers les minerais : il
//  trouve beaucoup trop de diamants pour la pierre cassée.
//
//  Indice = (minerais trouvés / 1000 blocs) ÷ taux normal
//    ~1   : normal
//    2-3  : chanceux… ou à surveiller
//    > 3  : suspect
//  Ce n'est qu'un indice : grottes, TNT, mines de villages… peuvent
//  le faire monter. À regarder avec la carte et le bon sens.
// =============================================================

const PIERRES = ['stone', 'deepslate', 'tuff', 'granite', 'diorite', 'andesite', 'calcite']
const NETHER = ['netherrack', 'basalt', 'blackstone', 'soul_sand', 'soul_soil']

// Taux "normaux" (pour 1000 blocs du même environnement), en minage classique.
// Volontairement larges : mieux vaut rater un tricheur que d'accuser un pote.
const REFERENCE = { diamant: 4, debris: 3 }

// Minimum de blocs cassés avant de juger (sinon un seul filon fausse tout)
const MINIMUM = { pierre: 1500, nether: 800 }

export type RapportXray = {
  uuid: string
  nom: string
  tempsDeJeu: number
  pierre: number
  nether: number
  minerais: Record<string, number>
  diamantPour1000: number | null
  debrisPour1000: number | null
  indiceDiamant: number | null
  indiceDebris: number | null
  verdict: 'ok' | 'surveiller' | 'suspect' | 'pas_assez'
  // Analyse précise par le journal Ledger (si installé)
  ledger: AnalyseLedger | null
}

const MINERAIS: Record<string, string[]> = {
  diamant: ['diamond_ore', 'deepslate_diamond_ore'],
  debris: ['ancient_debris'],
  or: ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore'],
  emeraude: ['emerald_ore', 'deepslate_emerald_ore'],
  fer: ['iron_ore', 'deepslate_iron_ore'],
  lapis: ['lapis_ore', 'deepslate_lapis_ore'],
  redstone: ['redstone_ore', 'deepslate_redstone_ore'],
}

const arrondi = (n: number) => Math.round(n * 100) / 100

function analyser(uuid: string, nom: string, stats: Record<string, Record<string, number>>): RapportXray {
  const mines = stats['minecraft:mined'] ?? {}
  const n = (blocs: string[]) => blocs.reduce((a, b) => a + (mines[`minecraft:${b}`] ?? 0), 0)

  const pierre = n(PIERRES)
  const nether = n(NETHER)
  const minerais = Object.fromEntries(Object.entries(MINERAIS).map(([k, blocs]) => [k, n(blocs)]))

  const diamantPour1000 = pierre > 0 ? (minerais.diamant / pierre) * 1000 : null
  const debrisPour1000 = nether > 0 ? (minerais.debris / nether) * 1000 : null
  const indiceDiamant = pierre >= MINIMUM.pierre && diamantPour1000 !== null ? diamantPour1000 / REFERENCE.diamant : null
  const indiceDebris = nether >= MINIMUM.nether && debrisPour1000 !== null ? debrisPour1000 / REFERENCE.debris : null

  const pire = Math.max(indiceDiamant ?? 0, indiceDebris ?? 0)
  const verdict =
    indiceDiamant === null && indiceDebris === null ? 'pas_assez' : pire > 3 ? 'suspect' : pire > 2 ? 'surveiller' : 'ok'

  return {
    uuid,
    nom,
    tempsDeJeu: Math.round((stats['minecraft:custom']?.['minecraft:play_time'] ?? 0) / 20),
    pierre,
    nether,
    minerais,
    diamantPour1000: diamantPour1000 === null ? null : arrondi(diamantPour1000),
    debrisPour1000: debrisPour1000 === null ? null : arrondi(debrisPour1000),
    indiceDiamant: indiceDiamant === null ? null : arrondi(indiceDiamant),
    indiceDebris: indiceDebris === null ? null : arrondi(indiceDebris),
    verdict,
    ledger: null,
  }
}

async function rapports(): Promise<RapportXray[]> {
  const dossier = path.join(config.mcData, config.mcMonde, 'stats')
  let fichiers: string[]
  try {
    fichiers = (await readdir(dossier)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const noms = new Map((await lireJoueurs()).map((j) => [j.uuid, j.nom]))
  const liste = await Promise.all(
    fichiers.map(async (f) => {
      const uuid = f.replace(/\.json$/, '')
      try {
        const brut = JSON.parse(await readFile(path.join(dossier, f), 'utf8')) as { stats?: Record<string, Record<string, number>> }
        return analyser(uuid, noms.get(uuid) ?? uuid.slice(0, 8), brut.stats ?? {})
      } catch {
        return null
      }
    }),
  )
  // Le journal Ledger, quand il a assez de données, remplace l'estimation par les stats
  const journal = analyserLedger()
  for (const r of liste) {
    if (!r) continue
    r.ledger = journal.get(r.uuid) ?? null
    const indices = [r.ledger?.diamant.indice, r.ledger?.debris.indice].filter((i): i is number => i != null)
    if (indices.length) {
      const pire = Math.max(...indices)
      r.verdict = pire > 3 ? 'suspect' : pire > 2 ? 'surveiller' : 'ok'
    } else if (r.ledger) {
      // Le journal existe mais pas assez de filons creusés pour juger :
      // s'il en a trouvé plusieurs à découvert (grottes), c'est normal.
      const trouves = r.ledger.diamant.filons + r.ledger.debris.filons
      r.verdict = trouves >= 3 ? 'ok' : 'pas_assez'
    }
  }
  const ordre = { suspect: 0, surveiller: 1, ok: 2, pas_assez: 3 }
  return liste
    .filter((r): r is RapportXray => r !== null)
    .sort((a, b) => ordre[a.verdict] - ordre[b.verdict] || (b.indiceDiamant ?? 0) - (a.indiceDiamant ?? 0))
}

// ------------------------------------------------------------------
// Mot de passe (header "x-admin"), avec blocage après trop d'essais ratés
// ------------------------------------------------------------------
const tropDEchecs = limiteur(10, 15 * 60_000)

function verifierAdmin(req: Request, res: Response, next: NextFunction) {
  if (!config.adminMdp) return void res.status(503).json({ erreur: 'Espace admin désactivé (ADMIN_MDP vide)' })
  const recu = Buffer.from(String(req.header('x-admin') ?? ''))
  const attendu = Buffer.from(config.adminMdp)
  if (recu.length === attendu.length && timingSafeEqual(recu, attendu)) return next()
  if (tropDEchecs(req.ip)) return void res.status(429).json({ erreur: 'Trop d’essais. Réessaie dans 15 minutes.' })
  res.status(403).json({ erreur: 'Mot de passe incorrect' })
}

// ------------------------------------------------------------------
// Historique : l'indice de chacun est noté toutes les heures (une ligne
// par joueur et par jour, mise à jour au fil de la journée)
// ------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS xray_historique (
    jour           TEXT NOT NULL,
    uuid           TEXT NOT NULL,
    indice_diamant REAL,
    indice_debris  REAL,
    filons         INTEGER NOT NULL DEFAULT 0,
    verdict        TEXT NOT NULL,
    PRIMARY KEY (jour, uuid)
  );
  CREATE TABLE IF NOT EXISTS xray_notes (
    uuid      TEXT PRIMARY KEY,
    surveille INTEGER NOT NULL DEFAULT 0,
    note      TEXT NOT NULL DEFAULT '',
    le        TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)
const noterJour = db.prepare(`
  INSERT OR REPLACE INTO xray_historique (jour, uuid, indice_diamant, indice_debris, filons, verdict)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const lireHistorique = db.prepare(`
  SELECT jour, uuid, indice_diamant AS diamant, indice_debris AS debris, verdict
  FROM xray_historique WHERE jour >= ? ORDER BY jour
`)
const lireNotes = db.prepare('SELECT uuid, surveille, note, le FROM xray_notes')
const ecrireNote = db.prepare(`
  INSERT INTO xray_notes (uuid, surveille, note, le) VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(uuid) DO UPDATE SET surveille = excluded.surveille, note = excluded.note, le = excluded.le
`)

const formatJour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' })

export async function enregistrerXray() {
  const jour = formatJour.format(new Date())
  for (const r of await rapports()) {
    const d = r.ledger ? r.ledger.diamant.indice : r.indiceDiamant
    const n = r.ledger ? r.ledger.debris.indice : r.indiceDebris
    const filons = (r.ledger?.diamant.filons ?? 0) + (r.ledger?.debris.filons ?? 0)
    noterJour.run(jour, r.uuid, d, n, filons, r.verdict)
  }
}

export function routesAdmin(): Router {
  const r = Router()
  r.use(verifierAdmin)

  r.get('/xray', async (_req, res) => {
    const joueurs = await rapports()
    const depuis = formatJour.format(new Date(Date.now() - 30 * 86_400_000))
    const historique: Record<string, { jour: string; diamant: number | null; debris: number | null; verdict: string }[]> = {}
    for (const h of lireHistorique.all(depuis) as { jour: string; uuid: string; diamant: number | null; debris: number | null; verdict: string }[]) {
      ;(historique[h.uuid] ??= []).push({ jour: h.jour, diamant: h.diamant, debris: h.debris, verdict: h.verdict })
    }
    const notes = Object.fromEntries(
      (lireNotes.all() as { uuid: string; surveille: number; note: string; le: string }[]).map((n) => [
        n.uuid,
        { surveille: Boolean(n.surveille), note: n.note, le: n.le },
      ]),
    )
    // Le fil en direct : les dernières trouvailles, tous joueurs confondus
    const recents = joueurs
      .flatMap((j) => (j.ledger?.derniers ?? []).map((f) => ({ ...f, uuid: j.uuid, nom: j.nom, chemin: [] })))
      .sort((a, b) => b.le.localeCompare(a.le))
      .slice(0, 15)
    res.json({ reference: REFERENCE, minimum: MINIMUM, ledger: ledgerActif(), maintenant: new Date().toISOString(), joueurs, historique, notes, recents })
  })

  // Marquer un joueur « à surveiller » et lui laisser une note
  r.put('/notes/:uuid', (req, res) => {
    const uuid = String(req.params.uuid)
    if (!/^[0-9a-f-]{32,36}$/i.test(uuid)) return void res.status(400).json({ erreur: 'Joueur invalide' })
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : ''
    ecrireNote.run(uuid, req.body?.surveille ? 1 : 0, note)
    res.json({ ok: true })
  })

  return r
}
