import express from 'express'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { config } from './config.ts'
import { statut } from './statut.ts'
import { classements } from './classements.ts'
import { lireJoueurs } from './joueurs.ts'
import { routesObjectifs } from './objectifs.ts'

const app = express()
app.set('trust proxy', 1) // derrière Caddy : la vraie IP du visiteur est dans X-Forwarded-For
app.use(express.json({ limit: '20kb' }))

// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------
app.get('/api/statut', async (_req, res) => {
  res.json(await statut())
})

app.get('/api/classements', async (_req, res) => {
  res.json(await classements())
})

app.get('/api/joueurs', async (_req, res) => {
  res.json(await lireJoueurs())
})

app.use('/api/objectifs', routesObjectifs())

app.use('/api', (_req, res) => {
  res.status(404).json({ erreur: 'Introuvable' })
})

// ------------------------------------------------------------------
// Le site React (dossier dist/, créé par "npm run build")
// ------------------------------------------------------------------
const dist = path.resolve(import.meta.dirname, '../dist')
if (existsSync(dist)) {
  // Les fichiers de assets/ ont un nom qui change à chaque build : cache long
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(dist, { index: false }))
  // Toutes les autres adresses -> index.html (c'est React qui gère les pages)
  app.get('/{*page}', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(config.port, () => {
  console.log(`Site Minecraft prêt sur http://localhost:${config.port}`)
  console.log(`  données Minecraft : ${config.mcData}  |  BlueMap : ${config.bluemapUrl}`)
  console.log(`  code objectifs : ${config.codeObjectifs ? 'activé' : 'DÉSACTIVÉ (tout le monde peut écrire)'}`)
})
