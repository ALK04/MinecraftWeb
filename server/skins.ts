import { Router } from 'express'
import { lireJoueurs } from './joueurs.ts'

// =============================================================
//  Skins des joueurs, servis par le site lui-même.
//
//  Les services publics (mc-heads, minotar…) gardent parfois un vieux
//  skin, ou le skin par défaut, pendant des heures. On demande donc
//  directement à Mojang, et c'est le navigateur qui découpe la tête et
//  le corps dans l'image (voir src/lib/skins.ts).
// =============================================================

const DUREE_CACHE = 30 * 60_000 // un skin changé apparaît au plus 30 min après
const cache = new Map<string, { png: Buffer | null; date: number }>()

async function telechargerSkin(uuid: string): Promise<Buffer | null> {
  const profil = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replaceAll('-', '')}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!profil.ok) return null
  const { properties } = (await profil.json()) as { properties?: { name: string; value: string }[] }
  const textures = properties?.find((p) => p.name === 'textures')
  if (!textures) return null
  const url = (JSON.parse(Buffer.from(textures.value, 'base64').toString('utf8')) as { textures?: { SKIN?: { url: string } } })
    .textures?.SKIN?.url
  if (!url) return null // pas de skin perso : le navigateur affichera l'initiale

  const image = await fetch(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(5000) })
  return image.ok ? Buffer.from(await image.arrayBuffer()) : null
}

async function skin(uuid: string): Promise<Buffer | null> {
  const enCache = cache.get(uuid)
  if (enCache && Date.now() - enCache.date < DUREE_CACHE) return enCache.png
  try {
    const png = await telechargerSkin(uuid)
    cache.set(uuid, { png, date: Date.now() })
    return png
  } catch {
    // Mojang injoignable : on garde l'ancien skin s'il y en a un
    return enCache?.png ?? null
  }
}

export function routesSkins(): Router {
  const r = Router()

  r.get('/:uuid', async (req, res) => {
    const uuid = req.params.uuid.toLowerCase()
    // Seulement les joueurs déjà venus sur le serveur (pas un relais ouvert vers Mojang)
    const connu = (await lireJoueurs()).some((j) => j.uuid.toLowerCase() === uuid)
    if (!connu) return void res.status(404).end()

    const png = await skin(uuid)
    if (!png) return void res.status(404).end()
    res.set('Cache-Control', 'public, max-age=600').type('png').send(png)
  })

  return r
}
