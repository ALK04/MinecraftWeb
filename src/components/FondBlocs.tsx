import { useEffect, useRef } from 'react'

// Fond animé : des blocs (herbe, pierre, bois... et des minerais !) qui flottent
// en 3D isométrique et suivent légèrement la souris. Clic = coup de pioche.

type Minerai = { nom: string; couleurs: [string, string] }

type Bloc = {
  x: number
  y: number
  taille: number
  profondeur: number // 0 = loin, 1 = près
  vitesse: number
  phase: number
  couleurs: [string, string, string] // dessus, gauche, droite
  minerai: Minerai | null
  taches: { face: 0 | 1 | 2; u: number; v: number; c: number }[]
  coups: number
  choc: number // images de tremblement restantes
  px: number // position à l'écran au dernier dessin
  py: number
}

const TYPES: [string, string, string][] = [
  ['#5fbf3f', '#7a5233', '#5e3f27'], // herbe
  ['#5fbf3f', '#7a5233', '#5e3f27'],
  ['#9aa0a6', '#73787d', '#5a5e62'], // pierre
  ['#d6b37a', '#a8875a', '#846944'], // planches
  ['#3f3a4f', '#2c2838', '#201d29'], // obsidienne
  ['#e8e2d0', '#c4bca6', '#a39b85'], // quartz
]
const PIERRE: [string, string, string] = ['#8f959b', '#6c7176', '#54585c']

export const MINERAIS: (Minerai & { poids: number })[] = [
  { nom: 'diamant', couleurs: ['#6ff3fb', '#2bb5c0'], poids: 1 },
  { nom: 'or', couleurs: ['#fcee4b', '#d4a92a'], poids: 2 },
  { nom: 'émeraude', couleurs: ['#2bf074', '#0b9c40'], poids: 1 },
  { nom: 'redstone', couleurs: ['#ff3030', '#b31010'], poids: 2 },
  { nom: 'lapis', couleurs: ['#4a6ff0', '#1e3a9e'], poids: 2 },
]
const SAC = MINERAIS.flatMap((m) => Array<Minerai>(m.poids).fill(m))

function nouveauBloc(l: number, h: number, profondeur = Math.random()): Bloc {
  const minerai = Math.random() < 0.28 ? SAC[Math.floor(Math.random() * SAC.length)] : null
  return {
    x: Math.random() * l,
    y: Math.random() * h,
    taille: 10 + profondeur * 26,
    profondeur,
    vitesse: 0.08 + profondeur * 0.25,
    phase: Math.random() * Math.PI * 2,
    couleurs: minerai ? PIERRE : TYPES[Math.floor(Math.random() * TYPES.length)],
    minerai,
    taches: minerai
      ? Array.from({ length: 9 }, (_, i) => ({
          face: (i % 3) as 0 | 1 | 2,
          u: 0.15 + Math.random() * 0.7,
          v: 0.15 + Math.random() * 0.7,
          c: Math.round(Math.random()),
        }))
      : [],
    coups: 0,
    choc: 0,
    px: 0,
    py: 0,
  }
}

function creerBlocs(l: number, h: number): Bloc[] {
  const n = Math.round(Math.min(36, Math.max(16, (l * h) / 40000)))
  return Array.from({ length: n }, () => nouveauBloc(l, h)).sort((a, b) => a.profondeur - b.profondeur)
}

function face(ctx: CanvasRenderingContext2D, pts: number[], couleur: string) {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fillStyle = couleur
  ctx.fill()
}

function dessinerCube(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: readonly string[]) {
  const w = s * 0.866
  face(ctx, [x, y - s, x + w, y - s / 2, x, y, x - w, y - s / 2], c[0])
  face(ctx, [x - w, y - s / 2, x, y, x, y + s, x - w, y + s / 2], c[1])
  face(ctx, [x, y, x + w, y - s / 2, x + w, y + s / 2, x, y + s], c[2])
}

// Un point (u, v) sur une des 3 faces visibles du cube
function surFace(x: number, y: number, s: number, f: 0 | 1 | 2, u: number, v: number): [number, number] {
  const w = s * 0.866
  if (f === 0) return [x - w + u * w + v * w, y - s / 2 - (u * s) / 2 + (v * s) / 2] // dessus
  if (f === 1) return [x - w + u * w, y - s / 2 + (u * s) / 2 + v * s] // gauche
  return [x + u * w, y - (u * s) / 2 + v * s] // droite
}

export type CoupDePioche = {
  x: number
  y: number
  couleurs: string[]
  minerai: string | null
  casse: boolean
}

export function FondBlocs({ className, onCoup }: { className?: string; onCoup?: (c: CoupDePioche) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const coupRef = useRef(onCoup)
  useEffect(() => {
    coupRef.current = onCoup
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
            Object.assign(b, nouveauBloc(l, h, b.profondeur), { y: h + 60 })
          }
        }
        const flotte = Math.sin(t / 1400 + b.phase) * 6 * b.profondeur
        let px = b.x + souris.cx * 30 * b.profondeur
        let py = b.y + flotte + souris.cy * 20 * b.profondeur
        if (b.choc > 0) {
          b.choc--
          px += (Math.random() - 0.5) * 6
          py += (Math.random() - 0.5) * 6
        }
        b.px = px
        b.py = py
        ctx.globalAlpha = 0.3 + b.profondeur * 0.65
        dessinerCube(ctx, px, py, b.taille, b.couleurs)

        // Les taches de minerai, qui scintillent un peu
        if (b.minerai) {
          const brille = 0.75 + Math.sin(t / 300 + b.phase) * 0.25
          const tt = b.taille * 0.2
          for (const tache of b.taches) {
            const [tx, ty] = surFace(px, py, b.taille, tache.face, tache.u, tache.v)
            ctx.globalAlpha = (0.3 + b.profondeur * 0.65) * (tache.face === 0 ? brille : brille * 0.85)
            ctx.fillStyle = b.minerai.couleurs[tache.c]
            ctx.fillRect(tx - tt / 2, ty - tt / 2, tt, tt)
          }
        }
        // Fissures : le bloc s'assombrit à chaque coup
        if (b.coups > 0) {
          ctx.globalAlpha = 0.18 * b.coups
          dessinerCube(ctx, px, py, b.taille, ['#000', '#000', '#000'])
        }
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

    // Clic : on cherche le bloc touché (le plus proche de nous d'abord).
    // Bloc normal = 1 coup ; minerai = 3 coups.
    const cliquer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      for (let i = blocs.length - 1; i >= 0; i--) {
        const b = blocs[i]
        if (Math.abs(x - b.px) < b.taille * 0.95 && Math.abs(y - b.py) < b.taille * 1.05) {
          b.coups++
          b.choc = 10
          const casse = !b.minerai || b.coups >= 3
          coupRef.current?.({
            x: e.clientX,
            y: e.clientY,
            couleurs: b.minerai ? [...b.minerai.couleurs, ...PIERRE] : [...b.couleurs],
            minerai: b.minerai?.nom ?? null,
            casse,
          })
          if (casse) Object.assign(b, nouveauBloc(l, h, b.profondeur), { y: h + 60 + Math.random() * 200 })
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
