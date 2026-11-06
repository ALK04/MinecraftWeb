import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Clock, Gem, Play, RotateCcw, Trophy } from 'lucide-react'
import { Bouton, EnTete, Tete } from '@/components/communs'
import { api, useApi, type Joueur } from '@/lib/api'
import { useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { cn, ecrireStockage, lireStockage, nombre } from '@/lib/utils'

// « Chasse aux orbes » : attrape les orbes d'XP avant qu'elles disparaissent.
// Combo = multiplicateur. Diamant = gros bonus. Horloge = +5 s. Creeper = NE PAS TOUCHER.

const DUREE = 60

type Type = 'orbe' | 'diamant' | 'horloge' | 'creeper'
type Objet = { id: number; x: number; y: number; r: number; type: Type; vie: number; max: number; phase: number }
type Texte = { id: number; x: number; y: number; texte: string; couleur: string }
type Phase = 'accueil' | 'jeu' | 'fin'
type Score = { pseudo: string; score: number }

const VISAGE = ['........', '........', '.XX..XX.', '.XX..XX.', '...XX...', '..XXXX..', '..XXXX..', '..X..X..']

export default function MiniJeu() {
  const { eclats, orbes, secouer, debloquer, pseudo } = useJeu()
  const { data: records, recharger } = useApi<Score[]>('/api/scores')
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')

  const [phase, setPhase] = useState<Phase>('accueil')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [temps, setTemps] = useState(DUREE)
  const [textes, setTextes] = useState<Texte[]>([])
  const [meilleur, setMeilleur] = useState(() => Number(lireStockage('record-orbes') || 0))
  const [nouveauRecord, setNouveauRecord] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const etat = useRef({ objets: [] as Objet[], score: 0, combo: 0, fin: 0, prochain: 0, id: 0, enCours: false })

  // ---------------- Boucle de jeu ----------------
  useEffect(() => {
    if (phase !== 'jeu') return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const e = etat.current
    let raf = 0
    let derniereSeconde = DUREE

    const taille = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    taille()
    const ro = new ResizeObserver(taille)
    ro.observe(canvas)

    const apparition = (t: number) => {
      const l = canvas.clientWidth
      const h = canvas.clientHeight
      const avance = 1 - (e.fin - t) / (DUREE * 1000) // 0 → 1 au fil de la partie
      const tirage = Math.random()
      const type: Type = tirage < 0.07 ? 'diamant' : tirage < 0.12 ? 'horloge' : tirage < 0.12 + 0.1 + avance * 0.12 ? 'creeper' : 'orbe'
      const r = type === 'diamant' ? 16 : type === 'creeper' ? 26 : type === 'horloge' ? 20 : 18 + Math.random() * 8
      e.objets.push({
        id: e.id++,
        x: r + Math.random() * (l - 2 * r),
        y: r + Math.random() * (h - 2 * r),
        r,
        type,
        vie: 0,
        max: (type === 'diamant' ? 900 : type === 'creeper' ? 2600 : 2000) * (1 - avance * 0.45),
        phase: Math.random() * 6,
      })
      e.prochain = t + (650 - avance * 380) * (0.6 + Math.random() * 0.8)
    }

    let precedent = performance.now()
    const boucle = (t: number) => {
      const dt = t - precedent
      precedent = t
      const reste = Math.max(0, Math.ceil((e.fin - t) / 1000))
      if (reste !== derniereSeconde) {
        derniereSeconde = reste
        setTemps(reste)
        if (reste <= 5 && reste > 0) sons.bois()
      }
      if (t >= e.fin) return terminer()
      if (t >= e.prochain) apparition(t)

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      e.objets = e.objets.filter((o) => {
        o.vie += dt
        if (o.vie < o.max) return true
        // Orbe ratée : le combo retombe (les creepers, on a le droit de les rater)
        if (o.type === 'orbe' || o.type === 'diamant') {
          e.combo = 0
          setCombo(0)
        }
        return false
      })
      for (const o of e.objets) dessiner(ctx, o, t)
      raf = requestAnimationFrame(boucle)
    }

    const terminer = () => {
      e.enCours = false
      setTemps(0)
      setPhase('fin')
      sons.fanfare()
      debloquer('arcade')
      if (e.score >= 1000) debloquer('pro')
      const ancien = Number(lireStockage('record-orbes') || 0)
      if (e.score > ancien) {
        ecrireStockage('record-orbes', String(e.score))
        setMeilleur(e.score)
        setNouveauRecord(true)
      }
      if (pseudo && e.score > 0) {
        void api('/api/scores', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pseudo, score: e.score }),
        })
          .then(() => recharger())
          .catch(() => {})
      }
    }

    raf = requestAnimationFrame(boucle)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [phase])

  const demarrer = () => {
    const t = performance.now()
    etat.current = { objets: [], score: 0, combo: 0, fin: t + DUREE * 1000, prochain: t + 300, id: 0, enCours: true }
    setScore(0)
    setCombo(0)
    setTemps(DUREE)
    setNouveauRecord(false)
    setPhase('jeu')
    sons.pling()
  }

  const flotter = (x: number, y: number, texte: string, couleur: string) => {
    const id = Math.random()
    setTextes((t) => [...t.slice(-12), { id, x, y, texte, couleur }])
    setTimeout(() => setTextes((t) => t.filter((u) => u.id !== id)), 800)
  }

  // ---------------- Clic ----------------
  const cliquer = (ev: PointerEvent<HTMLCanvasElement>) => {
    const e = etat.current
    if (!e.enCours) return
    const r = ev.currentTarget.getBoundingClientRect()
    const x = ev.clientX - r.left
    const y = ev.clientY - r.top
    // On prend l'objet touché le plus récent (celui dessiné au-dessus)
    const touche = [...e.objets].reverse().find((o) => Math.hypot(o.x - x, o.y - y) < o.r + 8)
    if (!touche) {
      if (e.combo > 0) flotter(x, y, 'raté !', '#b3a7b8')
      e.combo = 0
      setCombo(0)
      return
    }
    e.objets = e.objets.filter((o) => o !== touche)
    const mult = Math.min(5, 1 + Math.floor(e.combo / 5))

    if (touche.type === 'creeper') {
      e.score = Math.max(0, e.score - 50)
      e.combo = 0
      setCombo(0)
      sons.boum()
      secouer(16)
      eclats(ev.clientX, ev.clientY, ['#5ec34a', '#3f8f32', '#ff9d2e', '#666'], 50, 12)
      flotter(x, y, '-50 BOUM', '#ff6b6b')
    } else if (touche.type === 'horloge') {
      e.fin += 5000
      sons.pling()
      eclats(ev.clientX, ev.clientY, ['#fcee4b', '#d4a92a'], 16, 5)
      flotter(x, y, '+5 s', '#fcee4b')
    } else {
      const points = (touche.type === 'diamant' ? 50 : 10) * mult
      e.score += points
      e.combo++
      setCombo(e.combo)
      if (touche.type === 'diamant') {
        orbes(ev.clientX, ev.clientY, 6)
        eclats(ev.clientX, ev.clientY, ['#6ff3fb', '#2bb5c0', '#ffffff'], 24, 7)
      } else {
        sons.xp()
        eclats(ev.clientX, ev.clientY, ['#c8ff3a', '#7dff4a', '#f6ff6a'], 8, 4)
      }
      flotter(x, y, `+${points}${mult > 1 ? ` ×${mult}` : ''}`, touche.type === 'diamant' ? '#6ff3fb' : '#c8ff3a')
    }
    setScore(e.score)
  }

  const mult = Math.min(5, 1 + Math.floor(combo / 5))
  const uuidDe = (nom: string) => joueurs?.find((j) => j.nom.toLowerCase() === nom.toLowerCase())?.uuid ?? nom

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Mini-jeu" titre="Chasse aux orbes">
        <div className="text-right">
          <p className="ombre-mc font-pixel text-2xl text-[#ffff55]">{nombre(meilleur)}</p>
          <p className="text-xs text-muted-foreground">ton record</p>
        </div>
      </EnTete>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Le terrain */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-[radial-gradient(ellipse_at_top,#2a1f4a,#120d1f_70%)] select-none sm:aspect-[16/10]">
          <div className="fond-grille absolute inset-0 opacity-50" />

          {/* Tableau de bord */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 font-pixel">
            <span className="ombre-mc text-2xl text-white tabular-nums">{nombre(score)}</span>
            <AnimatePresence>
              {combo >= 5 && (
                <motion.span
                  key={mult}
                  initial={{ scale: 2, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  className="ombre-mc text-lg text-[#ffff55]"
                >
                  COMBO ×{mult}
                </motion.span>
              )}
            </AnimatePresence>
            <span className={cn('ombre-mc flex items-center gap-1.5 text-2xl tabular-nums', temps <= 5 ? 'animate-pulse text-red-400' : 'text-white')}>
              <Clock size={18} /> {temps}
            </span>
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={cliquer}
            className={cn('curseur-pioche absolute inset-0 h-full w-full touch-none', phase !== 'jeu' && 'pointer-events-none')}
          />

          {/* +10, raté, BOUM... */}
          {textes.map((t) => (
            <motion.span
              key={t.id}
              className="ombre-mc pointer-events-none absolute z-10 -translate-x-1/2 font-pixel text-lg font-bold"
              style={{ left: t.x, top: t.y, color: t.couleur }}
              initial={{ y: 0, opacity: 1, scale: 0.6 }}
              animate={{ y: -50, opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.8 }}
            >
              {t.texte}
            </motion.span>
          ))}

          {/* Écrans d'accueil et de fin */}
          <AnimatePresence>
            {phase !== 'jeu' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 grid place-items-center bg-black/50 p-6 text-center backdrop-blur-sm"
              >
                {phase === 'accueil' ? (
                  <div className="max-w-sm">
                    <p className="ombre-mc mb-4 font-pixel text-3xl text-white sm:text-4xl">Prêt ?</p>
                    <ul className="mb-6 space-y-2 text-left text-sm">
                      <Regle couleur="#9dff4a" rond>Orbe : 10 pts. Enchaîne-les pour un combo (jusqu'à ×5).</Regle>
                      <Regle couleur="#6ff3fb">Diamant : 50 pts. Rare et rapide.</Regle>
                      <Regle couleur="#fcee4b" rond>Horloge : +5 secondes.</Regle>
                      <Regle couleur="#5ec34a">Creeper : NE CLIQUE PAS. −50 pts.</Regle>
                    </ul>
                    <Bouton onClick={demarrer} className="px-8 py-3 text-base">
                      <Play size={18} fill="currentColor" /> Jouer (60 s)
                    </Bouton>
                  </div>
                ) : (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
                    <p className="font-pixel text-sm text-muted-foreground">Partie terminée</p>
                    <p className="ombre-mc my-2 font-pixel text-6xl text-white">{nombre(score)}</p>
                    {nouveauRecord && (
                      <motion.p
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="mb-2 font-pixel text-lg text-[#ffff55]"
                      >
                        NOUVEAU RECORD !
                      </motion.p>
                    )}
                    <p className="mb-6 text-sm text-muted-foreground">{commentaire(score)}</p>
                    {!pseudo && (
                      <p className="mb-4 text-xs text-muted-foreground">
                        Donne ton pseudo (bouton « succès » en bas de page) pour apparaître dans les records.
                      </p>
                    )}
                    <Bouton onClick={demarrer}>
                      <RotateCcw size={16} /> Rejouer
                    </Bouton>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Les records */}
        <aside className="rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-pixel text-lg">
            <Trophy size={18} className="text-[#ffff55]" /> Records
          </h2>
          {!records?.length && <p className="text-sm text-muted-foreground">Personne n'a encore joué. La place est libre !</p>}
          <ol className="space-y-2">
            {records?.map((r, i) => (
              <motion.li
                key={r.pseudo}
                layout
                className={cn(
                  'flex items-center gap-3 rounded-xl px-2 py-1.5',
                  r.pseudo.toLowerCase() === pseudo.toLowerCase() && 'bg-primary/10',
                )}
              >
                <span className={cn('w-5 font-pixel', ['text-amber-300', 'text-slate-200', 'text-orange-300'][i] ?? 'text-muted-foreground')}>
                  {i + 1}
                </span>
                <Tete uuid={uuidDe(r.pseudo)} nom={r.pseudo} taille={24} />
                <span className="flex-1 truncate text-sm font-semibold">{r.pseudo}</span>
                <span className="font-pixel text-sm tabular-nums">{nombre(r.score)}</span>
              </motion.li>
            ))}
          </ol>
          <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gem size={12} /> Astuce : ne rate pas de clic, ça casse le combo.
          </p>
        </aside>
      </div>
    </main>
  )
}

function Regle({ couleur, rond, children }: { couleur: string; rond?: boolean; children: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn('mt-0.5 size-4 shrink-0', rond && 'rounded-full')}
        style={{ background: couleur, boxShadow: `0 0 10px ${couleur}` }}
      />
      <span className="text-white/90">{children}</span>
    </li>
  )
}

function commentaire(score: number) {
  if (score === 0) return 'Zéro. Tu as cliqué sur le creeper exprès, avoue.'
  if (score < 200) return 'Échauffement. Tes doigts dorment encore.'
  if (score < 500) return 'Pas mal ! Un villageois serait fier de toi.'
  if (score < 1000) return 'Belle partie. Le combo, c’est la clé.'
  if (score < 2000) return 'Main de diamant. Respect.'
  return 'Tu as un problème. Un beau problème.'
}

// ---------------- Dessin des objets ----------------
function dessiner(ctx: CanvasRenderingContext2D, o: Objet, t: number) {
  const reste = 1 - o.vie / o.max
  // Apparition rapide, puis rétrécit doucement ; clignote à la fin
  const entree = Math.min(1, o.vie / 150)
  const echelle = entree * (0.55 + 0.45 * reste)
  if (reste < 0.25 && Math.floor(t / 90) % 2) ctx.globalAlpha = 0.45
  const r = o.r * echelle
  const y = o.y + Math.sin(t / 300 + o.phase) * 3

  if (o.type === 'orbe') {
    const g = ctx.createRadialGradient(o.x, y, 0, o.x, y, r * 1.6)
    g.addColorStop(0, '#f6ff9a')
    g.addColorStop(0.45, '#9dff4a')
    g.addColorStop(1, 'rgba(120,255,60,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(o.x, y, r * 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#d8ff6a'
    ctx.fillRect(o.x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7)
  } else if (o.type === 'diamant') {
    ctx.save()
    ctx.translate(o.x, y)
    ctx.rotate(t / 400)
    ctx.shadowColor = '#6ff3fb'
    ctx.shadowBlur = 20
    ctx.fillStyle = '#6ff3fb'
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(r, 0)
    ctx.lineTo(0, r)
    ctx.lineTo(-r, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#d6fdff'
    ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.3, r * 0.3)
    ctx.restore()
  } else if (o.type === 'horloge') {
    ctx.shadowColor = '#fcee4b'
    ctx.shadowBlur = 16
    ctx.fillStyle = '#d4a92a'
    ctx.beginPath()
    ctx.arc(o.x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff3b0'
    ctx.beginPath()
    ctx.arc(o.x, y, r * 0.72, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#5a4210'
    ctx.lineWidth = Math.max(2, r * 0.12)
    ctx.beginPath()
    ctx.moveTo(o.x, y)
    ctx.lineTo(o.x + Math.cos(t / 200) * r * 0.55, y + Math.sin(t / 200) * r * 0.55)
    ctx.moveTo(o.x, y)
    ctx.lineTo(o.x, y - r * 0.4)
    ctx.stroke()
  } else {
    // Tête de creeper
    const c = r * 2
    const p = c / 8
    const x0 = o.x - r
    const y0 = y - r
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = VISAGE[j][i] === 'X' ? '#141414' : ['#5ec34a', '#4fae3e', '#6fd35a'][(i * 3 + j * 5) % 3]
        ctx.fillRect(x0 + i * p, y0 + j * p, p + 0.5, p + 0.5)
      }
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}
