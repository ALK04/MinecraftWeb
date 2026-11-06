// Le "moteur" des trucs fun : particules, orbes d'XP, tremblement d'écran, succès,
// et quelques secrets (Konami code, mots magiques...).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownToLine, Bomb, Calendar, CheckCheck, Copy, Crown, Eye, Feather, Flame, Flower2, Gamepad2, Gem, Ghost, Hammer,
  Hand, Moon, MoonStar, Move, Pickaxe, Quote, Rocket, ShieldCheck, Sparkles, Sunrise, Joystick, Zap, Camera,
  type LucideIcon,
} from 'lucide-react'
import { api } from './api'
import { sons } from './sons'
import { ecrireStockage, lireStockage } from './utils'

type DefSucces = { titre: string; desc: string; icone: LucideIcon; secret?: boolean }

// ⚠️ Garder les clés identiques à IDS_SUCCES dans server/succes.ts
export const SUCCES = {
  adresse: { titre: 'Prêt au combat', desc: "Copier l'adresse du serveur", icone: Copy },
  panneau: { titre: 'Déménageur', desc: 'Déplacer le panneau', icone: Move },
  ecrivain: { titre: 'Plume et encrier', desc: 'Écrire sur le panneau', icone: Feather },
  lanceur: { titre: 'Lancer olympique', desc: 'Lancer le panneau très, très fort', icone: Rocket },
  bloc: { titre: 'Casseur de blocs', desc: 'Casser un bloc dans le ciel', icone: Pickaxe },
  demolisseur: { titre: 'Démolisseur', desc: 'Casser 50 blocs dans le ciel', icone: Hammer },
  minerai: { titre: 'Premier filon', desc: 'Miner un bloc de minerai', icone: Sparkles },
  diamant: { titre: 'DES DIAMANTS !', desc: 'Miner un diamant', icone: Gem },
  nuit: { titre: 'Maître du temps', desc: 'Passer du jour à la nuit', icone: Moon },
  insomnie: { titre: 'Insomniaque', desc: 'Changer 10 fois le jour et la nuit', icone: Sunrise },
  splash: { titre: 'Lecteur assidu', desc: 'Lire 10 messages jaunes', icone: Quote },
  creeper: { titre: 'Ça fait boum', desc: 'Se faire exploser par un creeper', icone: Bomb },
  sangfroid: { titre: 'Sang-froid', desc: "Fuir un creeper juste avant qu'il explose", icone: ShieldCheck },
  kamikaze: { titre: 'Kamikaze', desc: 'Exploser 5 fois', icone: Flame },
  fond: { titre: 'Au fond de la mine', desc: 'Atteindre la bedrock', icone: ArrowDownToLine },
  objectif: { titre: 'Mission accomplie', desc: 'Terminer un objectif', icone: CheckCheck },
  tape: { titre: 'Bagarreur', desc: 'Taper 10 têtes dans les classements', icone: Hand },
  respect: { titre: 'Press F', desc: 'Rendre hommage au cimetière', icone: Flower2 },
  arcade: { titre: "Joueur d'arcade", desc: 'Finir une partie de Chasse aux orbes', icone: Joystick },
  pro: { titre: 'Main de diamant', desc: 'Faire 1 000 points à la Chasse aux orbes', icone: Zap },
  paparazzi: { titre: 'Paparazzi', desc: 'Aller voir la star du jour', icone: Camera },
  fidele: { titre: 'Habitué', desc: 'Revenir sur le site 3 jours différents', icone: Calendar },
  nocturne: { titre: 'Créature de la nuit', desc: 'Visiter le site entre 1 h et 5 h du matin', icone: MoonStar, secret: true },
  konami: { titre: 'Tricheur !', desc: '↑ ↑ ↓ ↓ ← → ← → B A', icone: Gamepad2, secret: true },
  herobrine: { titre: 'Il est là…', desc: 'Écrire son nom', icone: Eye, secret: true },
  vide: { titre: 'Tombé dans le vide', desc: "Trouver une page qui n'existe pas", icone: Ghost, secret: true },
  completionniste: { titre: 'Complétionniste', desc: 'Débloquer tous les autres succès', icone: Crown },
} satisfies Record<string, DefSucces>

export type IdSucces = keyof typeof SUCCES
export const IDS = Object.keys(SUCCES) as IdSucces[]
export const defSucces = (id: string): DefSucces | undefined => (SUCCES as Record<string, DefSucces>)[id]

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
  pluie: (couleurs: string[], n?: number) => void
  secouer: (force?: number) => void
  debloquer: (id: IdSucces) => void
  // Incrémente un compteur ; débloque `id` quand il atteint `seuil`
  compter: (cle: string, seuil: number, id: IdSucces) => void
  debloques: IdSucces[]
  pseudo: string
  setPseudo: (p: string) => void
}

const Contexte = createContext<Jeu | null>(null)

export function useJeu() {
  const j = useContext(Contexte)
  if (!j) throw new Error('useJeu hors de <FournisseurJeu>')
  return j
}

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']

export function FournisseurJeu({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Particule[]>([])
  const raf = useRef(0)
  const [debloques, setDebloques] = useState<IdSucces[]>(
    () => lireStockage('succes').split(',').filter((s): s is IdSucces => s in SUCCES),
  )
  const dejaRef = useRef(debloques)
  const [file, setFile] = useState<IdSucces[]>([])
  const [pseudo, setPseudoEtat] = useState(() => lireStockage('pseudo'))
  const [herobrine, setHerobrine] = useState(false)

  // ---------------- Particules ----------------
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
      ctx.globalAlpha = Math.min(1, 1.6 * (1 - p.vie / p.max))
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

  const debloquer = (id: IdSucces) => {
    if (dejaRef.current.includes(id)) return
    const n = [...dejaRef.current, id]
    const aAfficher: IdSucces[] = [id]
    // Tous les autres sont faits ? Bonus !
    if (!n.includes('completionniste') && IDS.every((i) => i === 'completionniste' || n.includes(i))) {
      n.push('completionniste')
      aAfficher.push('completionniste')
    }
    dejaRef.current = n
    ecrireStockage('succes', n.join(','))
    setDebloques(n)
    setFile((f) => [...f, ...aAfficher])
    sons.succes()
  }

  const jeu: Jeu = {
    debloques,
    pseudo,
    setPseudo: (p) => {
      setPseudoEtat(p)
      ecrireStockage('pseudo', p)
    },
    debloquer,
    compter: (cle, seuil, id) => {
      const n = Number(lireStockage(`compteur-${cle}`) || 0) + 1
      ecrireStockage(`compteur-${cle}`, String(n))
      if (n >= seuil) debloquer(id)
    },
    eclats: (x, y, couleurs, n = 26, force = 7) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = (0.3 + Math.random()) * force
        parts.current.push({
          x, y,
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
    pluie: (couleurs, n = 120) => {
      for (let i = 0; i < n; i++) {
        parts.current.push({
          x: Math.random() * innerWidth,
          y: -20 - Math.random() * innerHeight * 0.8,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 2 + Math.random() * 4,
          taille: 8 + Math.random() * 10,
          couleur: couleurs[i % couleurs.length],
          vie: 0,
          max: 160 + Math.random() * 80,
          gravite: 0.12,
          rond: false,
          rot: Math.random() * 3,
          vrot: (Math.random() - 0.5) * 0.15,
        })
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
  }
  const jeuRef = useRef(jeu)
  jeuRef.current = jeu

  // ---------------- Visites : habitué, oiseau de nuit ----------------
  useEffect(() => {
    const j = jeuRef.current
    const h = new Date().getHours()
    if (h >= 1 && h < 5) j.debloquer('nocturne')
    const jour = new Date().toISOString().slice(0, 10)
    const jours = new Set(lireStockage('jours').split(',').filter(Boolean))
    jours.add(jour)
    ecrireStockage('jours', [...jours].slice(-30).join(','))
    if (jours.size >= 3) j.debloquer('fidele')
  }, [])

  // ---------------- Envoi des succès au serveur (pour le classement) ----------------
  useEffect(() => {
    if (!pseudo || debloques.length === 0) return
    const t = setTimeout(() => {
      void api('/api/succes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pseudo, ids: debloques }),
      }).catch(() => {
        /* joueur inconnu ou serveur injoignable : pas grave */
      })
    }, 800)
    return () => clearTimeout(t)
  }, [pseudo, debloques])

  // ---------------- Codes secrets au clavier ----------------
  useEffect(() => {
    let touches: string[] = []
    let lettres = ''
    const appui = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement
      if (cible.closest('input, textarea, select, [contenteditable]')) return
      const t = e.key.toLowerCase()
      touches = [...touches, t].slice(-KONAMI.length)
      if (touches.join() === KONAMI.join()) {
        touches = []
        modeArcEnCiel()
      }
      if (t.length === 1) {
        lettres = (lettres + t).slice(-12)
        if (lettres.endsWith('herobrine')) {
          lettres = ''
          setHerobrine(true)
          sons.angoisse()
          setTimeout(() => setHerobrine(false), 2400)
          setTimeout(() => jeuRef.current.debloquer('herobrine'), 2500)
        }
        if (lettres.endsWith('creeper')) {
          lettres = ''
          window.dispatchEvent(new Event('creeper-ici'))
        }
        if (lettres.endsWith('diamant')) {
          lettres = ''
          jeuRef.current.pluie(['#6ff3fb', '#2bb5c0', '#d6fdff'], 80)
        }
      }
    }
    const modeArcEnCiel = () => {
      const j = jeuRef.current
      sons.fanfare()
      j.pluie(['#6ff3fb', '#fcee4b', '#2bf074', '#ff3030', '#4a6ff0', '#ff6b9d'], 160)
      j.debloquer('konami')
      document.documentElement.classList.add('arc-en-ciel')
      setTimeout(() => document.documentElement.classList.remove('arc-en-ciel'), 10_000)
    }
    window.addEventListener('keydown', appui)
    return () => window.removeEventListener('keydown', appui)
  }, [])

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

      {/* Notification de succès */}
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
                <p className="text-xs text-[#ffff55]">{courant === 'completionniste' ? 'DÉFI RÉUSSI !' : 'Succès débloqué !'}</p>
                <p className="truncate text-sm text-white">{s.titre}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Herobrine... */}
      <AnimatePresence>
        {herobrine && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[99] grid place-items-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0.96, 1] }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="flex gap-16 sm:gap-24"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1, 1.05, 3], opacity: [0, 1, 1, 1] }}
              transition={{ duration: 2.3, times: [0, 0.3, 0.85, 1], ease: 'easeIn' }}
            >
              <span className="h-6 w-14 bg-white shadow-[0_0_40px_10px_rgba(255,255,255,0.6)] sm:h-8 sm:w-20" />
              <span className="h-6 w-14 bg-white shadow-[0_0_40px_10px_rgba(255,255,255,0.6)] sm:h-8 sm:w-20" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Contexte.Provider>
  )
}

export const COULEURS = {
  creeper: ['#5ec34a', '#3f8f32', '#8be070', '#2a2a2a', '#ffffff'],
  fleurs: ['#ff4d6d', '#ffd23f', '#ffffff', '#c77dff', '#4cc9f0'],
}
