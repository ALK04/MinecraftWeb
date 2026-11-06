// Le "moteur" des trucs fun : particules, orbes d'XP, tremblement d'écran et succès.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownToLine, Bomb, CheckCheck, Copy, Feather, Gem, Moon, Move, Pickaxe, Quote, Sparkles, type LucideIcon,
} from 'lucide-react'
import { sons } from './sons'
import { ecrireStockage, lireStockage } from './utils'

export const SUCCES = {
  adresse: { titre: 'Prêt au combat', desc: "Copier l'adresse du serveur", icone: Copy },
  panneau: { titre: 'Déménageur', desc: 'Déplacer le panneau', icone: Move },
  ecrivain: { titre: 'Plume et encrier', desc: 'Écrire sur le panneau', icone: Feather },
  bloc: { titre: 'Casseur de blocs', desc: 'Casser un bloc dans le ciel', icone: Pickaxe },
  nuit: { titre: 'Maître du temps', desc: 'Passer du jour à la nuit', icone: Moon },
  splash: { titre: 'Lecteur assidu', desc: 'Lire 10 messages jaunes', icone: Quote },
  creeper: { titre: 'Ça fait boum', desc: 'Se faire exploser par un creeper', icone: Bomb },
  minerai: { titre: 'Premier filon', desc: 'Miner un minerai', icone: Sparkles },
  diamant: { titre: 'DES DIAMANTS !', desc: 'Trouver un diamant', icone: Gem },
  fond: { titre: 'Au fond de la mine', desc: 'Atteindre la bedrock', icone: ArrowDownToLine },
  objectif: { titre: 'Mission accomplie', desc: 'Terminer un objectif', icone: CheckCheck },
} satisfies Record<string, { titre: string; desc: string; icone: LucideIcon }>

export type IdSucces = keyof typeof SUCCES

type Particule = {
  x: number
  y: number
  vx: number
  vy: number
  taille: number
  couleur: string
  vie: number
  max: number
  gravite: number
  rond: boolean
  rot: number
  vrot: number
}

type Jeu = {
  eclats: (x: number, y: number, couleurs: string[], n?: number, force?: number) => void
  orbes: (x: number, y: number, n?: number) => void
  secouer: (force?: number) => void
  debloquer: (id: IdSucces) => void
  debloques: IdSucces[]
}

const Contexte = createContext<Jeu | null>(null)

export function useJeu() {
  const j = useContext(Contexte)
  if (!j) throw new Error('useJeu hors de <FournisseurJeu>')
  return j
}

export function FournisseurJeu({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Particule[]>([])
  const raf = useRef(0)
  const [debloques, setDebloques] = useState<IdSucces[]>(
    () => lireStockage('succes').split(',').filter((s): s is IdSucces => s in SUCCES),
  )
  const dejaRef = useRef(debloques)
  const [file, setFile] = useState<IdSucces[]>([])

  const animer = () => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (c.width !== Math.round(innerWidth * dpr) || c.height !== Math.round(innerHeight * dpr)) {
      c.width = Math.round(innerWidth * dpr)
      c.height = Math.round(innerHeight * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, innerWidth, innerHeight)

    parts.current = parts.current.filter((p) => p.vie < p.max)
    for (const p of parts.current) {
      p.vie++
      p.vx *= 0.985
      p.vy += p.gravite
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vrot
      const alpha = Math.min(1, 1.6 * (1 - p.vie / p.max))
      ctx.globalAlpha = alpha
      if (p.rond) {
        ctx.shadowColor = p.couleur
        ctx.shadowBlur = 12
        ctx.fillStyle = p.couleur
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.taille / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.couleur
        ctx.fillRect(-p.taille / 2, -p.taille / 2, p.taille, p.taille)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
    raf.current = parts.current.length ? requestAnimationFrame(animer) : 0
  }

  const lancer = () => {
    if (!raf.current) raf.current = requestAnimationFrame(animer)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const jeu: Jeu = {
    debloques,
    eclats: (x, y, couleurs, n = 26, force = 7) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = (0.3 + Math.random()) * force
        parts.current.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - force * 0.6,
          taille: 4 + Math.random() * 7,
          couleur: couleurs[i % couleurs.length],
          vie: 0,
          max: 45 + Math.random() * 35,
          gravite: 0.38,
          rond: false,
          rot: Math.random() * 3,
          vrot: (Math.random() - 0.5) * 0.3,
        })
      }
      lancer()
    },
    orbes: (x, y, n = 9) => {
      const couleurs = ['#c8ff3a', '#7dff4a', '#f6ff6a', '#a8ff2a']
      for (let i = 0; i < n; i++) {
        parts.current.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 4,
          taille: 5 + Math.random() * 5,
          couleur: couleurs[i % couleurs.length],
          vie: 0,
          max: 60 + Math.random() * 40,
          gravite: 0.04,
          rond: true,
          rot: 0,
          vrot: 0,
        })
        setTimeout(sons.xp, i * 70)
      }
      lancer()
    },
    secouer: (force = 14) => {
      const racine = document.getElementById('root')
      if (!racine || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const images = Array.from({ length: 10 }, (_, i) => {
        const f = force * (1 - i / 10)
        return { transform: `translate(${(Math.random() - 0.5) * f * 2}px, ${(Math.random() - 0.5) * f * 2}px)` }
      })
      racine.animate([...images, { transform: 'none' }], { duration: 550, easing: 'ease-out' })
    },
    debloquer: (id) => {
      if (dejaRef.current.includes(id)) return
      const n = [...dejaRef.current, id]
      dejaRef.current = n
      ecrireStockage('succes', n.join(','))
      setDebloques(n)
      setFile((f) => [...f, id])
      sons.succes()
    },
  }

  // Chaque succès s'affiche 3,5 s, l'un après l'autre
  useEffect(() => {
    if (file.length === 0) return
    const t = setTimeout(() => setFile((f) => f.slice(1)), 3500)
    return () => clearTimeout(t)
  }, [file])

  const courant = file[0]
  const s = courant ? SUCCES[courant] : null

  return (
    <Contexte.Provider value={jeu}>
      {children}
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[90] h-full w-full" />
      <div className="pointer-events-none fixed top-4 right-4 z-[95] sm:top-24">
        <AnimatePresence mode="wait">
          {s && (
            <motion.div
              key={courant}
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="flex w-72 items-center gap-3 border-4 border-[#1b1b1b] bg-[#2b2b2b] p-3 shadow-[inset_0_0_0_2px_#555,0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <motion.div
                initial={{ rotate: -30, scale: 0.4 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.15 }}
                className="grid size-11 shrink-0 place-items-center bg-[#8b8b8b] text-[#1b1b1b] shadow-[inset_-3px_-3px_0_#555,inset_3px_3px_0_#c6c6c6]"
              >
                <s.icone size={22} strokeWidth={2.5} />
              </motion.div>
              <div className="min-w-0 font-pixel">
                <p className="text-xs text-[#ffff55]">Succès débloqué !</p>
                <p className="truncate text-sm text-white">{s.titre}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Contexte.Provider>
  )
}

// Petit bloc pixelisé, utile un peu partout
export const COULEURS = {
  herbe: ['#5fbf3f', '#4a9a30', '#7a5233', '#5e3f27'],
  pierre: ['#9aa0a6', '#73787d', '#5a5e62'],
  creeper: ['#5ec34a', '#3f8f32', '#8be070', '#2a2a2a', '#ffffff'],
}
