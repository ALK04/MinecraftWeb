import { useState, type MouseEvent } from 'react'
import { motion, AnimatePresence, LayoutGroup, useAnimate } from 'motion/react'
import { ArrowBigUp, Clock, Crown, Crosshair, Footprints, Pickaxe, Skull, Sword, Trophy, type LucideIcon } from 'lucide-react'
import { Chargement, EnTete, Tete } from '@/components/communs'
import { corps, useApi, type Joueur, type StatsJoueur } from '@/lib/api'
import { defSucces, IDS, useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { cn, distance, duree, nombre } from '@/lib/utils'

type Cle = Exclude<keyof StatsJoueur, 'uuid' | 'nom'> | 'succes'
type Ligne = { uuid: string; nom: string; valeur: number; succes?: string[] }
type ReponseSucces = { total: number; joueurs: { pseudo: string; succes: string[] }[] }

const STATS: { cle: Cle; nom: string; icone: LucideIcon; format: (n: number) => string; blague: string }[] = [
  { cle: 'tempsDeJeu', nom: 'Temps de jeu', icone: Clock, format: duree, blague: "Pensez à toucher de l'herbe. La vraie." },
  { cle: 'succes', nom: 'Succès', icone: Trophy, format: (n) => `${n}/${IDS.length}`, blague: 'Ceux qui ont trop exploré ce site.' },
  { cle: 'blocsMines', nom: 'Blocs minés', icone: Pickaxe, format: nombre, blague: 'Des taupes déguisées en humains.' },
  { cle: 'mobsTues', nom: 'Mobs tués', icone: Sword, format: nombre, blague: 'Les zombies ont peur de ces gens-là.' },
  { cle: 'distance', nom: 'Distance', icone: Footprints, format: distance, blague: 'Ils ne tiennent pas en place.' },
  { cle: 'joueursTues', nom: 'PvP', icone: Crosshair, format: nombre, blague: "L'amitié, c'est surfait." },
  { cle: 'morts', nom: 'Morts', icone: Skull, format: nombre, blague: 'Le mur de la honte. Respect quand même.' },
  { cle: 'sauts', nom: 'Sauts', icone: ArrowBigUp, format: nombre, blague: 'Des lapins, en vrai.' },
]

const MEDAILLES = [
  { couleur: 'from-amber-300 to-amber-600', texte: 'text-amber-300', halo: 'shadow-amber-400/40', hauteur: 'h-36 sm:h-44' },
  { couleur: 'from-slate-200 to-slate-500', texte: 'text-slate-200', halo: 'shadow-slate-300/30', hauteur: 'h-28 sm:h-32' },
  { couleur: 'from-orange-300 to-orange-700', texte: 'text-orange-300', halo: 'shadow-orange-400/30', hauteur: 'h-20 sm:h-24' },
]

export default function Classements() {
  const { data, erreur } = useApi<StatsJoueur[]>('/api/classements', 60_000)
  const { data: succes } = useApi<ReponseSucces>('/api/succes', 30_000)
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')
  const [cle, setCle] = useState<Cle>('tempsDeJeu')
  const stat = STATS.find((s) => s.cle === cle)!

  let lignes: Ligne[]
  if (cle === 'succes') {
    // Tous les joueurs connus, avec leurs succès (0 s'ils n'ont jamais joué avec le site)
    const parNom = new Map((succes?.joueurs ?? []).map((j) => [j.pseudo.toLowerCase(), j.succes]))
    lignes = (joueurs ?? []).map((j) => {
      const s = parNom.get(j.nom.toLowerCase()) ?? []
      return { uuid: j.uuid, nom: j.nom, valeur: s.length, succes: s }
    })
  } else {
    lignes = (data ?? []).map((j) => ({ uuid: j.uuid, nom: j.nom, valeur: j[cle] }))
  }
  const tries = lignes.sort((a, b) => b.valeur - a.valeur || a.nom.localeCompare(b.nom))
  const max = Math.max(1, tries[0]?.valeur ?? 1)
  const podium = tries.slice(0, 3)

  return (
    <main className="mx-auto max-w-5xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Hall of fame" titre="Classements" />

      {/* Onglets : la pastille glisse d'une stat à l'autre */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none]">
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
      <div className="mb-12 min-h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={cle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-pixel text-sm text-[#ffff55]"
          >
            {stat.blague}
            {cle === 'succes' && (
              <span className="mt-1 block font-sans text-xs text-muted-foreground">
                Pour y apparaître : débloque des succès sur le site, puis donne ton pseudo (bouton « succès » en bas de page).
              </span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      {erreur && <p className="text-center text-red-400">{erreur}</p>}
      {!data && !erreur && <Chargement />}
      {data && tries.length === 0 && (
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
                {rang === 0 && (
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className={cle === 'morts' ? 'text-slate-200' : 'text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.7)]'}
                  >
                    {cle === 'morts' ? <Skull size={30} /> : <Crown size={32} fill="currentColor" />}
                  </motion.div>
                )}
                <img
                  src={corps(j.uuid, 120)}
                  alt=""
                  className={cn('pixel mb-2 h-24 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] sm:h-32', rang === 0 && 'sm:h-40')}
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                />
                <p className="max-w-full truncate text-sm font-bold sm:text-base">{j.nom}</p>
                <p className={cn('mb-3 text-xs font-semibold tabular-nums sm:text-sm', m.texte)}>{stat.format(j.valeur)}</p>
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
                className="group relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary/[0.07]"
                  initial={false}
                  animate={{ width: `${(j.valeur / max) * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="relative flex items-center gap-4">
                  <span className={cn('w-7 text-center font-pixel text-lg', MEDAILLES[i]?.texte ?? 'text-muted-foreground')}>
                    {i + 1}
                  </span>
                  <TeteATaper uuid={j.uuid} nom={j.nom} />
                  <span className="flex-1 truncate font-semibold">{j.nom}</span>
                  <span className="font-semibold tabular-nums">{stat.format(j.valeur)}</span>
                </div>
                {j.succes && j.succes.length > 0 && (
                  <div className="relative mt-2 flex flex-wrap gap-1 pl-11">
                    {j.succes.map((id) => {
                      const s = defSucces(id)
                      if (!s) return null
                      return (
                        <span
                          key={id}
                          title={`${s.titre} — ${s.desc}`}
                          className="grid size-6 place-items-center bg-[#8b8b8b] text-[#1b1b1b] shadow-[inset_-2px_-2px_0_#555,inset_2px_2px_0_#c6c6c6]"
                        >
                          <s.icone size={13} strokeWidth={2.5} />
                        </span>
                      )
                    })}
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Les stats se mettent à jour à chaque sauvegarde du monde et quand un joueur se déconnecte.
        <br />
        (Oui, tu peux taper les têtes.)
      </p>
    </main>
  )
}

// Une tête qu'on peut frapper : elle rougit et recule, comme un joueur qui prend un coup
function TeteATaper({ uuid, nom }: { uuid: string; nom: string }) {
  const { compter, eclats } = useJeu()
  const [portee, animer] = useAnimate()
  const taper = (e: MouseEvent) => {
    sons.aie()
    compter('tapes', 10, 'tape')
    eclats(e.clientX, e.clientY, ['#ff3b3b', '#b30000'], 5, 3)
    void animer(
      portee.current,
      { x: [0, 8, -2, 0], rotate: [0, 12, -4, 0], filter: ['none', 'sepia(1) saturate(6) hue-rotate(-50deg)', 'none'] },
      { duration: 0.35 },
    )
  }
  return (
    <button ref={portee} onClick={taper} className="relative shrink-0 cursor-pointer" aria-label={`Taper ${nom}`}>
      <Tete uuid={uuid} nom={nom} taille={36} />
    </button>
  )
}
