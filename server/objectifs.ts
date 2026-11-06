import { Router, type Request, type Response, type NextFunction } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.ts'
import { db } from './db.ts'

// ------------------------------------------------------------------
// Base de données (un simple fichier SQLite)
// ------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS objectifs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titre       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    categorie   TEXT NOT NULL DEFAULT 'autre',
    pour        TEXT,                         -- NULL = objectif commun, sinon pseudo
    statut      TEXT NOT NULL DEFAULT 'a_faire'
                CHECK (statut IN ('a_faire', 'en_cours', 'fait')),
    cree_par    TEXT NOT NULL,
    pris_par    TEXT,
    fait_par    TEXT,
    cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
    fait_le     TEXT
  )
`)

export const CATEGORIES = ['construction', 'exploration', 'ferme', 'combat', 'collecte', 'autre'] as const

type Objectif = {
  id: number
  titre: string
  description: string
  categorie: string
  pour: string | null
  statut: 'a_faire' | 'en_cours' | 'fait'
  cree_par: string
  pris_par: string | null
  fait_par: string | null
  cree_le: string
  fait_le: string | null
}

const toutLire = db.prepare(`
  SELECT * FROM objectifs
  ORDER BY CASE statut WHEN 'en_cours' THEN 0 WHEN 'a_faire' THEN 1 ELSE 2 END,
           COALESCE(fait_le, cree_le) DESC
`)
const lireUn = db.prepare('SELECT * FROM objectifs WHERE id = ?')
const inserer = db.prepare(`
  INSERT INTO objectifs (titre, description, categorie, pour, cree_par)
  VALUES (?, ?, ?, ?, ?)
`)
const majStatut = db.prepare(`
  UPDATE objectifs SET statut = ?, pris_par = ?, fait_par = ?, fait_le = ? WHERE id = ?
`)
const supprimer = db.prepare('DELETE FROM objectifs WHERE id = ?')

// ------------------------------------------------------------------
// Vérifications
// ------------------------------------------------------------------
const PSEUDO = /^[A-Za-z0-9_]{1,16}$/ // format des pseudos Minecraft

function texte(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= max ? t : null
}

// Code d'accès pour écrire (header "x-code")
function verifierCode(req: Request, res: Response, next: NextFunction) {
  if (!config.codeObjectifs) return next()
  const recu = Buffer.from(String(req.header('x-code') ?? ''))
  const attendu = Buffer.from(config.codeObjectifs)
  if (recu.length === attendu.length && timingSafeEqual(recu, attendu)) return next()
  res.status(403).json({ erreur: 'Code incorrect' })
}

// Anti-spam : 40 modifications max par 10 minutes et par adresse IP
const ecritures = new Map<string, number[]>()
function antiSpam(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? '?'
  const maintenant = Date.now()
  const recentes = (ecritures.get(ip) ?? []).filter((t) => maintenant - t < 10 * 60_000)
  if (recentes.length >= 40) {
    res.status(429).json({ erreur: 'Doucement ! Réessaie dans quelques minutes.' })
    return
  }
  recentes.push(maintenant)
  ecritures.set(ip, recentes)
  next()
}

// ------------------------------------------------------------------
// Routes : /api/objectifs
// ------------------------------------------------------------------
export function routesObjectifs(): Router {
  const r = Router()

  r.get('/', (_req, res) => {
    res.json({
      objectifs: toutLire.all() as Objectif[],
      codeRequis: Boolean(config.codeObjectifs),
    })
  })

  // Vérifier un code sans rien modifier (pour l'écran "entre le code")
  r.post('/code', antiSpam, verifierCode, (_req, res) => {
    res.json({ ok: true })
  })

  r.post('/', antiSpam, verifierCode, (req, res) => {
    const titre = texte(req.body?.titre, 80)
    const auteur = texte(req.body?.auteur, 16)
    const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 500) : ''
    const categorie = CATEGORIES.includes(req.body?.categorie) ? req.body.categorie : 'autre'
    const pour = req.body?.pour ? texte(req.body.pour, 16) : null

    if (!titre) return void res.status(400).json({ erreur: 'Titre manquant (80 caractères max)' })
    if (!auteur || !PSEUDO.test(auteur)) return void res.status(400).json({ erreur: 'Pseudo invalide' })
    if (pour !== null && !PSEUDO.test(pour)) return void res.status(400).json({ erreur: 'Pseudo "pour" invalide' })

    const { lastInsertRowid } = inserer.run(titre, description, categorie, pour, auteur)
    res.status(201).json(lireUn.get(lastInsertRowid))
  })

  // Changer l'état : prendre / lâcher / terminer / rouvrir
  r.patch('/:id', antiSpam, verifierCode, (req, res) => {
    const obj = lireUn.get(Number(req.params.id)) as Objectif | undefined
    if (!obj) return void res.status(404).json({ erreur: 'Objectif introuvable' })

    const pseudo = texte(req.body?.pseudo, 16)
    if (!pseudo || !PSEUDO.test(pseudo)) return void res.status(400).json({ erreur: 'Pseudo invalide' })

    const maintenant = new Date().toISOString().slice(0, 19).replace('T', ' ')
    switch (req.body?.action) {
      case 'prendre':
        majStatut.run('en_cours', pseudo, null, null, obj.id)
        break
      case 'lacher':
        majStatut.run('a_faire', null, null, null, obj.id)
        break
      case 'terminer':
        majStatut.run('fait', obj.pris_par ?? pseudo, pseudo, maintenant, obj.id)
        break
      case 'rouvrir':
        majStatut.run('a_faire', null, null, null, obj.id)
        break
      default:
        return void res.status(400).json({ erreur: 'Action inconnue' })
    }
    res.json(lireUn.get(obj.id))
  })

  r.delete('/:id', antiSpam, verifierCode, (req, res) => {
    supprimer.run(Number(req.params.id))
    res.status(204).end()
  })

  return r
}
