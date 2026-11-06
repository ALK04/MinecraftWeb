import { Router } from 'express'
import { db } from './db.ts'
import { lireJoueurs } from './joueurs.ts'
import { limiteur } from './limite.ts'

// Les succès débloqués sur le site, par joueur (pour le classement).
// ⚠️ Garder cette liste identique aux clés de SUCCES dans src/lib/jeu.tsx
export const IDS_SUCCES = [
  'adresse', 'panneau', 'ecrivain', 'lanceur', 'bloc', 'demolisseur', 'minerai', 'diamant',
  'nuit', 'insomnie', 'splash', 'creeper', 'sangfroid', 'kamikaze', 'fond', 'objectif',
  'tape', 'respect', 'arcade', 'pro', 'paparazzi', 'fidele', 'nocturne', 'konami', 'herobrine', 'vide', 'completionniste',
]

db.exec(`
  CREATE TABLE IF NOT EXISTS succes (
    pseudo TEXT NOT NULL COLLATE NOCASE,
    id     TEXT NOT NULL,
    le     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (pseudo, id)
  )
`)

const tout = db.prepare('SELECT pseudo, id, le FROM succes ORDER BY le')
const inserer = db.prepare('INSERT OR IGNORE INTO succes (pseudo, id) VALUES (?, ?)')

// Anti-spam : 30 envois max par 10 minutes et par adresse IP
const tropDEnvois = limiteur(30, 10 * 60_000)

export function routesSucces(): Router {
  const r = Router()

  r.get('/', (_req, res) => {
    const parJoueur = new Map<string, { pseudo: string; succes: string[] }>()
    for (const ligne of tout.all() as { pseudo: string; id: string }[]) {
      const cle = ligne.pseudo.toLowerCase()
      if (!parJoueur.has(cle)) parJoueur.set(cle, { pseudo: ligne.pseudo, succes: [] })
      parJoueur.get(cle)!.succes.push(ligne.id)
    }
    res.json({ total: IDS_SUCCES.length, joueurs: [...parJoueur.values()] })
  })

  r.post('/', async (req, res) => {
    if (tropDEnvois(req.ip)) return void res.status(429).json({ erreur: 'Doucement !' })

    const pseudo = typeof req.body?.pseudo === 'string' ? req.body.pseudo.trim() : ''
    const ids: unknown = req.body?.ids
    if (!Array.isArray(ids)) return void res.status(400).json({ erreur: 'Liste manquante' })

    // Seuls les joueurs déjà venus sur le serveur peuvent apparaître au classement
    const joueur = (await lireJoueurs()).find((j) => j.nom.toLowerCase() === pseudo.toLowerCase())
    if (!joueur) return void res.status(404).json({ erreur: 'Joueur inconnu du serveur' })

    const valides = ids.filter((id): id is string => typeof id === 'string' && IDS_SUCCES.includes(id)).slice(0, 50)
    for (const id of valides) inserer.run(joueur.nom, id)
    res.json({ ok: true, pseudo: joueur.nom })
  })

  return r
}
