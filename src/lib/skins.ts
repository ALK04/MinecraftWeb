import { useEffect, useState } from 'react'

// =============================================================
//  Têtes et corps des joueurs, découpés dans leur skin Minecraft.
//  Le skin vient de notre serveur (/api/skin/<uuid>, copie de Mojang) :
//  on dessine la face avant à plat, en pixels, dans un petit canvas.
// =============================================================

export type Rendu = { tete: string; corps: string }

// Une seule fois par joueur et par visite, même s'il apparaît 10 fois sur la page
const rendus = new Map<string, Promise<Rendu | null>>()

function charger(uuid: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = `/api/skin/${uuid}`
  })
}

function dessiner(skin: HTMLImageElement): Rendu {
  const ancien = skin.height === 32 // vieux format 64×32 : pas de bras/jambe gauche ni de calques
  const lecture = document.createElement('canvas')
  lecture.width = skin.width
  lecture.height = skin.height
  const lc = lecture.getContext('2d')!
  lc.drawImage(skin, 0, 0)
  // Skin « fin » (Alex) : bras de 3 pixels, la colonne 54-55 du bras droit est vide
  const fin = !ancien && lc.getImageData(54, 20, 1, 1).data[3] === 0
  const bras = fin ? 3 : 4

  // Copie un morceau du skin (sx, sy, l, h) en (dx, dy), éventuellement en miroir
  const copier = (c: CanvasRenderingContext2D, sx: number, sy: number, l: number, h: number, dx: number, dy: number, miroir = false) => {
    if (sy + h > skin.height) return
    c.save()
    if (miroir) {
      c.translate(dx + l, dy)
      c.scale(-1, 1)
      c.drawImage(skin, sx, sy, l, h, 0, 0, l, h)
    } else {
      c.drawImage(skin, sx, sy, l, h, dx, dy, l, h)
    }
    c.restore()
  }

  // Tête : 8×8, avec le calque (chapeau, cheveux…)
  const tete = document.createElement('canvas')
  tete.width = tete.height = 8
  const tc = tete.getContext('2d')!
  copier(tc, 8, 8, 8, 8, 0, 0)
  copier(tc, 40, 8, 8, 8, 0, 0)

  // Corps vu de face : 16×32
  const corps = document.createElement('canvas')
  corps.width = 16
  corps.height = 32
  const cc = corps.getContext('2d')!
  cc.drawImage(tete, 4, 0)
  // Torse
  copier(cc, 20, 20, 8, 12, 4, 8)
  copier(cc, 20, 36, 8, 12, 4, 8)
  // Bras droit (à gauche de l'image) puis bras gauche
  copier(cc, 44, 20, bras, 12, 4 - bras, 8)
  copier(cc, 44, 36, bras, 12, 4 - bras, 8)
  if (ancien) copier(cc, 44, 20, bras, 12, 12, 8, true)
  copier(cc, 36, 52, bras, 12, 12, 8)
  copier(cc, 52, 52, bras, 12, 12, 8)
  // Jambe droite puis jambe gauche
  copier(cc, 4, 20, 4, 12, 4, 20)
  copier(cc, 4, 36, 4, 12, 4, 20)
  if (ancien) copier(cc, 4, 20, 4, 12, 8, 20, true)
  copier(cc, 20, 52, 4, 12, 8, 20)
  copier(cc, 4, 52, 4, 12, 8, 20)

  return { tete: tete.toDataURL(), corps: corps.toDataURL() }
}

function rendu(uuid: string): Promise<Rendu | null> {
  let p = rendus.get(uuid)
  if (!p) {
    p = charger(uuid).then((img) => (img ? dessiner(img) : null))
    rendus.set(uuid, p)
  }
  return p
}

// undefined = en cours de chargement, null = pas de skin
export function useSkin(uuid: string): Rendu | null | undefined {
  const [etat, setEtat] = useState<{ uuid: string; rendu: Rendu | null } | null>(null)
  useEffect(() => {
    let actif = true
    void rendu(uuid).then((r) => actif && setEtat({ uuid, rendu: r }))
    return () => {
      actif = false
    }
  }, [uuid])
  return etat?.uuid === uuid ? etat.rendu : undefined
}
