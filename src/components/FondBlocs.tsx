import { useEffect, useRef } from 'react'

// Fond animé : des blocs (herbe, pierre, minerais...) qui flottent en 3D isométrique
// et suivent légèrement la souris. Dessiné dans un <canvas>, très léger.

type Bloc = {
  x: number
  y: number
  taille: number
  profondeur: number // 0 = loin, 1 = près
  vitesse: number
  phase: number
  couleurs: [string, string, string] // dessus, gauche, droite
  px: number // position à l'écran au dernier dessin
  py: number
}

const TYPES: [string, string, string][] = [
  ['#5fbf3f', '#7a5233', '#5e3f27'], // herbe
  ['#5fbf3f', '#7a5233', '#5e3f27'],
  ['#9aa0a6', '#73787d', '#5a5e62'], // pierre
  ['#9aa0a6', '#73787d', '#5a5e62'],
  ['#5ce6e0', '#3aa8a4', '#2b7f7c'], // diamant
  ['#f0c94a', '#b8932c', '#8e7020'], // or
  ['#d6b37a', '#a8875a', '#846944'], // planches
  ['#3f3a4f', '#2c2838', '#201d29'], // obsidienne
]

function creerBlocs(l: number, h: number): Bloc[] {
  const n = Math.round(Math.min(34, Math.max(14, (l * h) / 42000)))
  return Array.from({ length: n }, () => {
    const profondeur = Math.random()
    return {
      x: Math.random() * l,
      y: Math.random() * h,
      taille: 10 + profondeur * 26,
      profondeur,
      vitesse: 0.08 + profondeur * 0.25,
      phase: Math.random() * Math.PI * 2,
      couleurs: TYPES[Math.floor(Math.random() * TYPES.length)],
      px: 0,
      py: 0,
    }
  }).sort((a, b) => a.profondeur - b.profondeur)
}

function dessinerCube(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: Bloc['couleurs']) {
  const w = s * 0.866
  const face = (pts: number[], couleur: string) => {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.closePath()
    ctx.fillStyle = couleur
    ctx.fill()
  }
  face([x, y - s, x + w, y - s / 2, x, y, x - w, y - s / 2], c[0])
  face([x - w, y - s / 2, x, y, x, y + s, x - w, y + s / 2], c[1])
  face([x, y, x + w, y - s / 2, x + w, y + s / 2, x, y + s], c[2])
}

type Casser = (x: number, y: number, couleurs: string[]) => void

export function FondBlocs({ className, onCasser }: { className?: string; onCasser?: Casser }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const casserRef = useRef(onCasser)
  useEffect(() => {
    casserRef.current = onCasser
  })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let l = 0
    let h = 0
    let blocs: Bloc[] = []
    let raf = 0
    const souris = { x: 0, y: 0, cx: 0, cy: 0 }

    const redimensionner = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      l = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = l * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      blocs = creerBlocs(l, h)
      if (reduit) dessiner(0)
    }

    const dessiner = (t: number) => {
      ctx.clearRect(0, 0, l, h)
      souris.cx += (souris.x - souris.cx) * 0.05
      souris.cy += (souris.y - souris.cy) * 0.05
      for (const b of blocs) {
        if (!reduit) {
          b.y -= b.vitesse
          if (b.y < -60) {
            b.y = h + 60
            b.x = Math.random() * l
          }
        }
        const flotte = Math.sin(t / 1400 + b.phase) * 6 * b.profondeur
        const px = b.x + souris.cx * 30 * b.profondeur
        const py = b.y + flotte + souris.cy * 20 * b.profondeur
        b.px = px
        b.py = py
        ctx.globalAlpha = 0.3 + b.profondeur * 0.65
        dessinerCube(ctx, px, py, b.taille, b.couleurs)
      }
      ctx.globalAlpha = 1
    }

    const boucle = (t: number) => {
      dessiner(t)
      raf = requestAnimationFrame(boucle)
    }

    const bouger = (e: PointerEvent) => {
      souris.x = e.clientX / window.innerWidth - 0.5
      souris.y = e.clientY / window.innerHeight - 0.5
    }

    // Clic : on cherche le bloc touché (le plus proche de nous d'abord) et on le casse
    const cliquer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (let i = blocs.length - 1; i >= 0; i--) {
        const b = blocs[i]
        if (Math.abs(x - b.px) < b.taille * 0.9 && Math.abs(y - b.py) < b.taille) {
          casserRef.current?.(e.clientX, e.clientY, b.couleurs)
          b.y = h + 60 + Math.random() * 200
          b.x = Math.random() * l
          if (reduit) dessiner(0)
          return
        }
      }
    }

    const ro = new ResizeObserver(redimensionner)
    ro.observe(canvas)
    redimensionner()
    canvas.addEventListener('pointerdown', cliquer)
    if (!reduit) {
      raf = requestAnimationFrame(boucle)
      window.addEventListener('pointermove', bouger)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', cliquer)
      window.removeEventListener('pointermove', bouger)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={className} />
}
