import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart } from 'lucide-react'
import { Chargement, EnTete, Tete } from '@/components/communs'
import { useApi, type StatsJoueur } from '@/lib/api'
import { COULEURS, useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { cn, nombre } from '@/lib/utils'

// Une tombe par joueur, selon son nombre de morts. Clique pour fleurir, appuie sur F pour rendre hommage.

const EPITAPHES = [
  "Pensait que la lave, c'était de l'eau orange.",
  'A creusé tout droit vers le bas. Une fois.',
  '« Je saute, c’est que 20 blocs. »',
  'A voulu faire un câlin à un creeper.',
  'Parti chercher du bois la nuit, sans torche.',
  'Ses diamants ne sont jamais revenus.',
  '« Ça va, il me reste 2 cœurs. »',
  'A dormi dans le Nether. Mauvaise idée.',
  'Mort en héros. Ou d’une chute, on ne sait plus.',
  'A cru que le loup était gentil.',
  'Noyé en cherchant une épave.',
  'Fan de TNT. Trop fan.',
  'A tapé un golem de fer « pour voir ».',
  'Le Warden l’a entendu éternuer.',
]

// Toujours la même épitaphe pour le même joueur
function epitaphe(nom: string) {
  let h = 0
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return EPITAPHES[h % EPITAPHES.length]
}

export default function Cimetiere() {
  const { data, erreur } = useApi<StatsJoueur[]>('/api/classements', 60_000)
  const { debloquer, eclats } = useJeu()
  const [hommage, setHommage] = useState(0)
  const debloquerRef = useRef(debloquer)
  debloquerRef.current = debloquer

  // Appuie sur F pour présenter tes respects
  useEffect(() => {
    const appui = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key.toLowerCase() !== 'f') return
      setHommage((n) => n + 1)
      sons.pling()
      debloquerRef.current('respect')
    }
    window.addEventListener('keydown', appui)
    return () => window.removeEventListener('keydown', appui)
  }, [])

  const tries = [...(data ?? [])].sort((a, b) => b.morts - a.morts)
  const total = tries.reduce((a, j) => a + j.morts, 0)

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Ici reposent nos héros" titre="Le Cimetière">
        <div className="text-right">
          <p className="ombre-mc font-pixel text-3xl text-red-300">{nombre(total)}</p>
          <p className="text-xs text-muted-foreground">morts au total</p>
        </div>
      </EnTete>

      <p className="-mt-6 mb-10 font-pixel text-sm text-[#ffff55]">
        Clique sur une tombe pour la fleurir. Appuie sur <kbd className="rounded border border-[#ffff55]/40 px-1.5">F</kbd>{' '}
        pour présenter tes respects.
      </p>

      {erreur && <p className="text-center text-red-400">{erreur}</p>}
      {!data && !erreur && <Chargement texte="On creuse…" />}

      <div className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {/* Brouillard qui traîne */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 bottom-0 h-40 bg-gradient-to-t from-white/[0.06] to-transparent blur-xl"
          animate={{ x: [-30, 30, -30] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        {tries.map((j, i) => (
          <Tombe key={j.uuid} j={j} index={i} eclats={eclats} />
        ))}
      </div>

      {/* Le gros F qui monte quand on rend hommage */}
      <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center">
        <AnimatePresence>
          {hommage > 0 && (
            <motion.span
              key={hommage}
              className="ombre-mc font-pixel text-[9rem] text-white"
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.1, 1.3], y: [40, 0, -120] }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            >
              F
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function Tombe({ j, index, eclats }: { j: StatsJoueur; index: number; eclats: ReturnType<typeof useJeu>['eclats'] }) {
  const [fleurs, setFleurs] = useState<{ id: number; x: number; c: string }[]>([])
  const vivant = j.morts === 0

  const fleurir = (e: MouseEvent) => {
    sons.fleur()
    eclats(e.clientX, e.clientY, COULEURS.fleurs, 10, 4)
    setFleurs((f) =>
      [...f, { id: Date.now(), x: 10 + Math.random() * 80, c: COULEURS.fleurs[Math.floor(Math.random() * 5)] }].slice(-9),
    )
  }

  return (
    <motion.button
      onClick={fleurir}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ rotate: index % 2 ? 2 : -2, y: -4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 16, delay: (index % 4) * 0.06 }}
      className="group relative flex flex-col items-center text-center"
    >
      {/* La pierre tombale */}
      <div
        className={cn(
          'relative w-full max-w-[200px] rounded-t-[80px] border-4 px-3 pt-8 pb-4',
          vivant ? 'border-primary/40 bg-primary/10' : 'border-[#4a4f57] bg-[#6c7179]',
        )}
        style={
          vivant
            ? undefined
            : { boxShadow: 'inset -6px -6px 0 rgba(0,0,0,0.25), inset 6px 6px 0 rgba(255,255,255,0.12)' }
        }
      >
        {/* Bougie */}
        {!vivant && (
          <div className="absolute -top-1 -right-2 flex flex-col items-center">
            <motion.span
              className="block size-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_6px_rgba(252,211,77,0.5)]"
              animate={{ scale: [1, 1.3, 0.9, 1.15, 1], opacity: [1, 0.8, 1, 0.85, 1] }}
              transition={{ duration: 1.2 + (index % 3) * 0.3, repeat: Infinity }}
            />
            <span className="h-4 w-2 bg-[#efe6d2]" />
          </div>
        )}
        <p className={cn('font-pixel text-lg', vivant ? 'text-primary' : 'text-[#2a2d31]')}>{vivant ? 'VIVANT' : 'R.I.P.'}</p>
        <Tete uuid={j.uuid} nom={j.nom} taille={40} className={cn('mx-auto my-2', !vivant && 'grayscale')} />
        <p className={cn('truncate font-bold', vivant ? 'text-foreground' : 'text-[#1d1f22]')}>{j.nom}</p>
        <p className={cn('mt-1 font-pixel text-sm', vivant ? 'text-primary' : 'text-[#3a1414]')}>
          {vivant ? (
            <span className="inline-flex items-center gap-1">
              <Heart size={12} fill="currentColor" /> 0 mort
            </span>
          ) : (
            `${nombre(j.morts)} mort${j.morts > 1 ? 's' : ''}`
          )}
        </p>
        <p className={cn('mt-2 text-[11px] leading-snug italic', vivant ? 'text-muted-foreground' : 'text-[#2a2d31]')}>
          {vivant ? 'Immortel… pour l’instant.' : epitaphe(j.nom)}
        </p>
      </div>
      {/* L'herbe, et les fleurs déposées */}
      <div className="relative h-5 w-full max-w-[230px] bg-[#5fbf3f] shadow-[inset_0_-6px_0_#7a5233]">
        <AnimatePresence>
          {fleurs.map((f) => (
            <motion.span
              key={f.id}
              className="absolute -top-3 flex flex-col items-center"
              style={{ left: `${f.x}%` }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            >
              <span className="size-2" style={{ background: f.c }} />
              <span className="h-2 w-0.5 bg-[#2e7d24]" />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}
