import { Router } from 'express'
import { db } from './db.ts'
import { lireJoueurs } from './joueurs.ts'
import { limiteur } from './limite.ts'

// Meilleurs scores du mini-jeu (un par joueur : on garde le record)
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    pseudo TEXT PRIMARY KEY COLLATE NOCASE,
    score  INTEGER NOT NULL,
    le     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)
const top = db.prepare('SELECT pseudo, score, le FROM scores ORDER BY score DESC, le ASC LIMIT 10')
const enregistrer = db.prepare(`
  INSERT INTO scores (pseudo, score) VALUES (?, ?)
  ON CONFLICT(pseudo) DO UPDATE SET score = excluded.score, le = datetime('now')
  WHERE excluded.score > scores.score
`)

const tropDEnvois = limiteur(20, 10 * 60_000)

export function routesScores(): Router {
  const r = Router()

  r.get('/', (_req, res) => {
    res.json(top.all())
  })

  r.post('/', async (req, res) => {
    if (tropDEnvois(req.ip)) return void res.status(429).json({ erreur: 'Doucement !' })
    const pseudo = typeof req.body?.pseudo === 'string' ? req.body.pseudo.trim() : ''
    const score = Number(req.body?.score)
    // Une partie dure 60 s : au-delà de 20 000 points, c'est de la triche
    if (!Number.isInteger(score) || score < 0 || score > 20_000) {
      return void res.status(400).json({ erreur: 'Score invalide' })
    }
    const joueur = (await lireJoueurs()).find((j) => j.nom.toLowerCase() === pseudo.toLowerCase())
    if (!joueur) return void res.status(404).json({ erreur: 'Joueur inconnu du serveur' })
    enregistrer.run(joueur.nom, score)
    res.json({ ok: true })
  })

  return r
}
