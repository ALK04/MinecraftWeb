import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { ArrowBigUp, Clock, Crosshair, Footprints, Pickaxe, Skull, Sword, type LucideIcon } from 'lucide-react'
import { Chargement, EnTete, Tete } from '@/components/communs'
import { corps, useApi, type StatsJoueur } from '@/lib/api'
import { cn, distance, duree, nombre } from '@/lib/utils'

type Cle = Exclude<keyof StatsJoueur, 'uuid' | 'nom'>

const STATS: { cle: Cle; nom: string; icone: LucideIcon; format: (n: number) => string }[] = [
  { cle: 'tempsDeJeu', nom: 'Temps de jeu', icone: Clock, format: duree },
  { cle: 'blocsMines', nom: 'Blocs minés', icone: Pickaxe, format: nombre },
  { cle: 'mobsTues', nom: 'Mobs tués', icone: Sword, format: nombre },
  { cle: 'distance', nom: 'Distance', icone: Footprints, format: distance },
  { cle: 'joueursTues', nom: 'PvP', icone: Crosshair, format: nombre },
  { cle: 'morts', nom: 'Morts', icone: Skull, format: nombre },
  { cle: 'sauts', nom: 'Sauts', icone: ArrowBigUp, format: nombre },
]

const MEDAILLES = [
  { couleur: 'from-amber-300 to-amber-600', texte: 'text-amber-300', halo: 'shadow-amber-400/40', hauteur: 'h-36 sm:h-44' },
  { couleur: 'from-slate-200 to-slate-500', texte: 'text-slate-200', halo: 'shadow-slate-300/30', hauteur: 'h-28 sm:h-32' },
  { couleur: 'from-orange-300 to-orange-700', texte: 'text-orange-300', halo: 'shadow-orange-400/30', hauteur: 'h-20 sm:h-24' },
]

export default function Classements() {
  const { data, erreur } = useApi<StatsJoueur[]>('/api/classements', 60_000)
  const [cle, setCle] = useState<Cle>('tempsDeJeu')
  const stat = STATS.find((s) => s.cle === cle)!

  const tries = [...(data ?? [])].sort((a, b) => b[cle] - a[cle] || a.nom.localeCompare(b.nom))
  const max = Math.max(1, tries[0]?.[cle] ?? 1)
  const podium = tries.slice(0, 3)

  return (
    <main className="mx-auto max-w-5xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Hall of fame" titre="Classements" />

      {/* Onglets : la pastille glisse d'une stat à l'autre */}
      <div className="-mx-4 mb-12 overflow-x-auto px-4 [scrollbar-width:none]">
        <LayoutGroup id="stats">
          <div className="inline-flex gap-1 rounded-full border border-border bg-card p-1">
            {STATS.map((s) => {
              const Icone = s.icone
              const actif = s.cle === cle
              return (
                <button
                  key={s.cle}
                  onClick={() => setCle(s.cle)}
                  className={cn(
                    'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
                    actif ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {actif && (
                    <motion.span
                      layoutId="onglet-stat"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icone size={15} className="relative" />
                  <span className="relative">{s.nom}</span>
                </button>
              )
            })}
          </div>
        </LayoutGroup>
      </div>

      {erreur && <p className="text-center text-red-400">{erreur}</p>}
      {!data && !erreur && <Chargement />}
      {data && data.length === 0 && (
        <p className="py-24 text-center text-muted-foreground">
          Pas encore de statistiques : il faut que quelqu'un joue un peu !
        </p>
      )}

      {podium.length > 0 && (
        <div className="mb-14 grid grid-cols-3 items-end gap-3 sm:gap-6">
          {[1, 0, 2].map((rang) => {
            const j = podium[rang]
            const m = MEDAILLES[rang]
            if (!j) return <div key={rang} />
            return (
              <motion.div
                key={`${rang}-${cle}`}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: [0.1, 0, 0.2][rang] }}
              >
                <img
                  src={corps(j.uuid, 120)}
                  alt=""
                  className={cn('pixel mb-2 h-24 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] sm:h-32', rang === 0 && 'sm:h-40')}
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                />
                <p className="max-w-full truncate text-sm font-bold sm:text-base">{j.nom}</p>
                <p className={cn('mb-3 text-xs font-semibold tabular-nums sm:text-sm', m.texte)}>{stat.format(j[cle])}</p>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 + [0.1, 0, 0.2][rang], ease: [0.22, 1, 0.36, 1] }}
                  style={{ originY: 1 }}
                  className={cn(
                    'relative grid w-full place-items-start justify-center overflow-hidden rounded-t-2xl bg-gradient-to-b pt-3 shadow-[0_0_50px_-10px]',
                    m.couleur,
                    m.halo,
                    m.hauteur,
                  )}
                >
                  <div className="fond-grille absolute inset-0 opacity-60" />
                  <span className="relative font-pixel text-4xl text-black/50 sm:text-5xl">{rang + 1}</span>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      )}

      {tries.length > 0 && (
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {tries.map((j, i) => (
              <motion.li
                key={j.uuid}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 34 }}
                className={cn(
                  'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30',
                )}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary/[0.07]"
                  initial={false}
                  animate={{ width: `${(j[cle] / max) * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className={cn('relative w-7 text-center font-pixel text-lg', MEDAILLES[i]?.texte ?? 'text-muted-foreground')}>
                  {i + 1}
                </span>
                <Tete uuid={j.uuid} nom={j.nom} taille={36} className="relative" />
                <span className="relative flex-1 truncate font-semibold">{j.nom}</span>
                <span className="relative font-semibold tabular-nums">{stat.format(j[cle])}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Les stats se mettent à jour à chaque sauvegarde du monde et quand un joueur se déconnecte.
      </p>
    </main>
  )
}
