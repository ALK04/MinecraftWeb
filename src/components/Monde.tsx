import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Trophy, Volume2, VolumeX } from 'lucide-react'
import { SUCCES, useJeu, type IdSucces } from '@/lib/jeu'
import { basculerSon, sonActif, sons } from '@/lib/sons'
import { Modale } from '@/components/communs'
import { site } from '@/config'
import { cn } from '@/lib/utils'

// Texture de bruit 16×16 (comme une texture de bloc), agrandie en pixels nets
function texture(teintes: [number, number], taille = 16) {
  const c = document.createElement('canvas')
  c.width = c.height = taille
  const x = c.getContext('2d')!
  for (let i = 0; i < taille; i++)
    for (let j = 0; j < taille; j++) {
      const v = Math.round(teintes[0] + Math.random() * (teintes[1] - teintes[0]))
      x.fillStyle = `rgb(${v},${v},${v})`
      x.fillRect(i, j, 1, 1)
    }
  return c.toDataURL()
}

// ------------------------------------------------------------------
// Le fond : plus tu descends, plus tu creuses (terre → pierre → deepslate)
// ------------------------------------------------------------------
export function FondMonde() {
  const { scrollY } = useScroll()
  const couleur = useTransform(
    scrollY,
    [0, 700, 1500, 2400, 3400],
    ['#33221a', '#2c1f19', '#252831', '#1c1d2a', '#170f24'],
  )
  const tex = useMemo(() => texture([70, 190]), [])
  return (
    <motion.div aria-hidden className="fixed inset-0 -z-50" style={{ backgroundColor: couleur }}>
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: `url(${tex})`, backgroundSize: '128px', imageRendering: 'pixelated' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45))]" />
    </motion.div>
  )
}

// ------------------------------------------------------------------
// Des filons de minerai dans les marges : 3 coups de pioche pour les miner
// ------------------------------------------------------------------
const MINERAIS = [
  { nom: 'fer', c: ['#e2b89c', '#b98b6c'], poids: 3 },
  { nom: 'or', c: ['#fcee4b', '#d4a92a'], poids: 2 },
  { nom: 'redstone', c: ['#ff3030', '#b31010'], poids: 3 },
  { nom: 'lapis', c: ['#4a6ff0', '#1e3a9e'], poids: 2 },
  { nom: 'émeraude', c: ['#2bf074', '#0b9c40'], poids: 1 },
  { nom: 'diamant', c: ['#6ff3fb', '#2bb5c0'], poids: 1 },
]
const SAC = MINERAIS.flatMap((m) => Array(m.poids).fill(m) as (typeof MINERAIS)[number][])

type Filon = { id: number; haut: number; cote: 'left' | 'right'; decalage: number; type: (typeof MINERAIS)[number]; pixels: number[] }

function creerFilons(debut: number): Filon[] {
  return Array.from({ length: 16 }, (_, id) => ({
    id,
    haut: debut + ((100 - debut - 4) * (id + Math.random() * 0.8)) / 16,
    cote: id % 2 ? 'left' : 'right',
    decalage: 8 + Math.random() * 30,
    type: SAC[Math.floor(Math.random() * SAC.length)],
    pixels: Array.from({ length: 16 }, (_, i) => i).filter(() => Math.random() < 0.45),
  }))
}

export function Minerais({ debut }: { debut: number }) {
  const [filons] = useState(() => creerFilons(debut))
  const [mines, setMines] = useState<number[]>([])
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden xl:block">
      {filons
        .filter((f) => !mines.includes(f.id))
        .map((f) => (
          <BlocMinerai key={f.id} f={f} mine={() => setMines((m) => [...m, f.id])} />
        ))}
    </div>
  )
}

function BlocMinerai({ f, mine }: { f: Filon; mine: () => void }) {
  const { eclats, orbes, debloquer } = useJeu()
  const [coups, setCoups] = useState(0)
  const [choc, setChoc] = useState(0)

  const piocher = (e: MouseEvent) => {
    const n = coups + 1
    setCoups(n)
    setChoc((c) => c + 1)
    sons.casse()
    eclats(e.clientX, e.clientY, [...f.type.c, '#6b7075'], n < 3 ? 6 : 28, n < 3 ? 3 : 7)
    if (n >= 3) {
      orbes(e.clientX, e.clientY, f.type.nom === 'diamant' ? 14 : 6)
      debloquer('minerai')
      if (f.type.nom === 'diamant') debloquer('diamant')
      mine()
    }
  }

  return (
    <motion.button
      tabIndex={-1}
      onClick={piocher}
      title={`Minerai de ${f.type.nom}`}
      className="curseur-pioche pointer-events-auto absolute grid size-8 grid-cols-4"
      style={{ top: `${f.haut}%`, [f.cote]: f.decalage }}
      animate={{ x: choc === 0 ? 0 : choc % 2 ? [0, -3, 3, 0] : [0, 3, -3, 0], opacity: 1 - coups * 0.2 }}
      whileHover={{ scale: 1.2 }}
      transition={{ duration: 0.18 }}
    >
      {Array.from({ length: 16 }, (_, i) => {
        const allume = f.pixels.includes(i)
        return (
          <span
            key={i}
            className={cn(allume && i === f.pixels[0] && 'animate-pulse')}
            style={{
              background: allume ? f.type.c[i % 2] : 'transparent',
              boxShadow: allume && i === f.pixels[0] ? `0 0 10px ${f.type.c[0]}` : undefined,
            }}
          />
        )
      })}
    </motion.button>
  )
}

// ------------------------------------------------------------------
// Le pied de page : la bedrock, le compteur de succès et le son
// ------------------------------------------------------------------
export function Bedrock() {
  const { debloques, debloquer } = useJeu()
  const ref = useRef<HTMLDivElement>(null)
  const [liste, setListe] = useState(false)
  const [son, setSon] = useState(sonActif)
  const tex = useMemo(() => texture([15, 95]), [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && debloquer('fond'), { threshold: 0.9 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [debloquer])

  const total = Object.keys(SUCCES).length

  return (
    <footer className="relative mt-20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 pb-6 text-xs text-muted-foreground">
        <button
          onClick={() => setListe(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-pixel text-[#ffff55] transition hover:scale-105"
        >
          <Trophy size={14} /> {debloques.length}/{total} succès
        </button>
        <button
          onClick={() => setSon(basculerSon())}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition hover:text-foreground"
        >
          {son ? <Volume2 size={14} /> : <VolumeX size={14} />} Son {son ? 'activé' : 'coupé'}
        </button>
        <span className="w-full text-center sm:w-auto">{site.nom} · Pas affilié à Mojang ni Microsoft</span>
      </div>
      {/* Un peu de lave qui rougeoie au-dessus de la bedrock */}
      <div className="pointer-events-none h-16 bg-gradient-to-b from-transparent to-orange-600/20" />
      <div
        ref={ref}
        className="h-14 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_6px_0_rgba(0,0,0,0.4)]"
        style={{ backgroundImage: `url(${tex})`, backgroundSize: '56px', imageRendering: 'pixelated' }}
      />
      <div className="h-20 bg-[#0d0d0d] sm:hidden" />

      <Modale ouverte={liste} fermer={() => setListe(false)} titre={`Succès · ${debloques.length}/${total}`}>
        <ul className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
          {(Object.keys(SUCCES) as IdSucces[]).map((id) => {
            const s = SUCCES[id]
            const ok = debloques.includes(id)
            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                  ok ? 'border-[#ffff55]/30 bg-[#ffff55]/5' : 'border-border opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center',
                    ok ? 'bg-[#8b8b8b] text-[#1b1b1b] shadow-[inset_-3px_-3px_0_#555,inset_3px_3px_0_#c6c6c6]' : 'bg-muted',
                  )}
                >
                  {ok ? <s.icone size={18} strokeWidth={2.5} /> : <span className="font-pixel">?</span>}
                </span>
                <div>
                  <p className={cn('font-pixel text-sm', ok ? 'text-[#ffff55]' : 'text-muted-foreground')}>
                    {ok ? s.titre : '???'}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Modale>
    </footer>
  )
}
