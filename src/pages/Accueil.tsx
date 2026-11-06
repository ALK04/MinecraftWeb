import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Ciel, Collines } from '@/components/Ciel'
import { useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Check, Copy, Map, Moon, Target, Trophy, Users } from 'lucide-react'
import { FondBlocs } from '@/components/FondBlocs'
import { Tete } from '@/components/communs'
import { site } from '@/config'
import { useApi, type Joueur, type ReponseObjectifs, type Statut, type StatsJoueur } from '@/lib/api'
import { cn, duree } from '@/lib/utils'

const douceur = [0.22, 1, 0.36, 1] as const

export default function Accueil() {
  const { data: statut } = useApi<Statut>('/api/statut', 15_000)
  const { data: stats } = useApi<StatsJoueur[]>('/api/classements')
  const { data: objectifs } = useApi<ReponseObjectifs>('/api/objectifs')
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')

  const top = [...(stats ?? [])].sort((a, b) => b.tempsDeJeu - a.tempsDeJeu).slice(0, 3)
  const liste = objectifs?.objectifs ?? []
  const compte = (s: string) => liste.filter((o) => o.statut === s).length

  return (
    <main>
      <Hero statut={statut} />

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 md:grid-cols-3">
          <CarteBento to="/carte-du-monde" className="md:col-span-2 md:row-span-2" delai={0}>
            <ApercuCarte />
            <div className="relative mt-auto">
              <Icone><Map size={20} /></Icone>
              <h3 className="mt-4 font-pixel text-2xl font-bold">La carte du monde</h3>
              <p className="mt-1 max-w-md text-muted-foreground">
                Explore le monde en 3D depuis ton navigateur, et vois où sont les autres en direct.
              </p>
              <Lien>Ouvrir la carte</Lien>
            </div>
          </CarteBento>

          <CarteBento to="/classements" delai={0.08}>
            <Icone><Trophy size={20} /></Icone>
            <h3 className="mt-4 font-pixel text-lg font-bold">Classements</h3>
            <ol className="mt-4 space-y-2.5">
              {top.length === 0 && <li className="text-sm text-muted-foreground">Personne n'a encore joué.</li>}
              {top.map((j, i) => (
                <li key={j.uuid} className="flex items-center gap-3 text-sm">
                  <span className={cn('w-4 font-pixel', ['text-amber-300', 'text-slate-300', 'text-orange-400'][i])}>
                    {i + 1}
                  </span>
                  <Tete uuid={j.uuid} nom={j.nom} taille={24} />
                  <span className="flex-1 truncate font-medium">{j.nom}</span>
                  <span className="text-muted-foreground tabular-nums">{duree(j.tempsDeJeu)}</span>
                </li>
              ))}
            </ol>
            <Lien>Voir tout</Lien>
          </CarteBento>

          <CarteBento to="/objectifs" delai={0.16}>
            <Icone><Target size={20} /></Icone>
            <h3 className="mt-4 font-pixel text-lg font-bold">Objectifs</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['En cours', compte('en_cours'), 'text-sky-300'],
                ['À faire', compte('a_faire'), 'text-foreground'],
                ['Faits', compte('fait'), 'text-primary'],
              ].map(([nom, n, couleur]) => (
                <div key={nom} className="rounded-2xl bg-muted/60 px-2 py-3">
                  <div className={cn('font-pixel text-2xl', couleur as string)}>{n}</div>
                  <div className="text-[11px] text-muted-foreground">{nom}</div>
                </div>
              ))}
            </div>
            <Lien>Le tableau</Lien>
          </CarteBento>

          <CarteBento to="/classements" className="md:col-span-3" delai={0.24}>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <Icone><Users size={20} /></Icone>
                <h3 className="mt-4 font-pixel text-lg font-bold">
                  {joueurs?.length ?? 0} joueur{(joueurs?.length ?? 0) > 1 ? 's' : ''} déjà passé{(joueurs?.length ?? 0) > 1 ? 's' : ''} par ici
                </h3>
              </div>
              <div className="flex flex-1 flex-wrap justify-end gap-2">
                {(joueurs ?? []).slice(0, 24).map((j, i) => (
                  <motion.div
                    key={j.uuid}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -4, scale: 1.1 }}
                  >
                    <Tete uuid={j.uuid} nom={j.nom} taille={40} />
                  </motion.div>
                ))}
              </div>
            </div>
          </CarteBento>
        </div>
      </section>
    </main>
  )
}

// ------------------------------------------------------------------

const SPLASHS = [
  'Aussi sur grille-pain !',
  '100 % fait main !',
  'Ne creuse pas sous tes pieds !',
  'Sans creeper (presque) !',
  'Les cochons ne volent pas !',
  'Patate cuite !',
  'Ça sent la lave !',
  'Le lit est une option !',
  'Plus de diamants que prévu !',
  'Pas de griefing, merci !',
  'Construit par des potes !',
  'Pioche pas fournie !',
  'Clique-moi encore !',
  'Où est mon chien ?',
  'Ça reste entre nous !',
]

function Hero({ statut }: { statut: Statut | null }) {
  const { eclats, debloquer } = useJeu()
  const [nuit, setNuit] = useState(false)
  const [splash, setSplash] = useState(() => Math.floor(Math.random() * SPLASHS.length))
  const lus = useRef(new Set<number>())

  const nouveauSplash = () => {
    sons.pling()
    setSplash((s) => {
      let n = s
      while (n === s) n = Math.floor(Math.random() * SPLASHS.length)
      return n
    })
  }
  useEffect(() => {
    lus.current.add(splash)
    if (lus.current.size >= 10) debloquer('splash')
  }, [splash, debloquer])

  return (
    <section className="relative isolate flex min-h-[94dvh] items-center justify-center overflow-hidden px-4 pt-10 pb-40 sm:pt-28">
      <Ciel
        nuit={nuit}
        basculer={() => {
          setNuit((n) => !n)
          sons.pling()
          debloquer('nuit')
        }}
      />
      <FondBlocs
        className="curseur-pioche absolute inset-0 -z-10 h-full w-full"
        onCasser={(x, y, couleurs) => {
          eclats(x, y, couleurs, 22, 6)
          sons.casse()
          debloquer('bloc')
        }}
      />
      <Collines />

      <div className="pointer-events-none relative z-10 max-w-3xl text-center [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_h1]:pointer-events-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <PastilleStatut statut={statut} />
        </motion.div>

        <div className="relative mt-8 inline-block">
          <h1 className="ombre-mc font-pixel text-5xl font-bold tracking-tight sm:text-8xl">
            {site.nom.split('').map((lettre, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: -80, rotate: (i % 2 ? 1 : -1) * 25 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                whileHover={{ y: -12, rotate: (i % 2 ? 1 : -1) * 10, color: '#6ee26a' }}
                transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 + i * 0.06 }}
              >
                {lettre}
              </motion.span>
            ))}
          </h1>
          <button
            onClick={nouveauSplash}
            className="absolute -right-6 -bottom-4 origin-center font-pixel text-sm whitespace-nowrap sm:-right-20 sm:bottom-0 sm:text-lg"
            title="Clique pour un autre message"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={splash}
                className="splash block"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {SPLASHS[splash]}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <motion.p
          className="ombre-mc mx-auto mt-8 max-w-xl text-lg text-pretty text-white/90"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: douceur }}
        >
          {site.slogan}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: douceur }}
        >
          <CopierAdresse />
          <Link
            to="/carte-du-monde"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-6 py-3.5 text-sm font-semibold backdrop-blur transition hover:border-primary/60"
          >
            Voir la carte
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 font-pixel text-xs text-white/70"
        >
          {site.version} · casse les blocs qui flottent, ils ne demandent que ça
        </motion.p>
      </div>
    </section>
  )
}


function PastilleStatut({ statut }: { statut: Statut | null }) {
  const enLigne = statut?.etat === 'en_ligne'
  const n = statut?.joueurs.length ?? 0
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background/60 py-1.5 pr-4 pl-3 text-sm backdrop-blur-md">
      {statut === null ? (
        <span className="size-2.5 animate-pulse rounded-full bg-muted-foreground" />
      ) : enLigne ? (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
      ) : (
        <Moon size={14} className="text-sky-300" />
      )}
      <span className="font-medium">
        {statut === null
          ? 'Connexion…'
          : enLigne
            ? n === 0
              ? 'En ligne · personne pour l’instant'
              : `En ligne · ${n} joueur${n > 1 ? 's' : ''}`
            : 'En veille · se réveille quand tu te connectes'}
      </span>
      <AnimatePresence>
        {enLigne && n > 0 && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex -space-x-1.5"
          >
            {statut.joueurs.slice(0, 5).map((j) => (
              <Tete key={j.uuid} uuid={j.uuid} nom={j.nom} taille={20} className="ring-2 ring-background" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CopierAdresse() {
  const { orbes, debloquer } = useJeu()
  const [copie, setCopie] = useState(false)
  const copier = async (e: MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    orbes(r.left + r.width / 2, r.top, 10)
    debloquer('adresse')
    setCopie(true)
    setTimeout(() => setCopie(false), 1800)
    try {
      await navigator.clipboard.writeText(site.adresse)
    } catch {
      /* pas de presse-papiers (http) : l'adresse reste lisible */
    }
  }
  return (
    <motion.button
      onClick={copier}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_40px_-6px] shadow-primary/80 hover:brightness-110"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="font-pixel">{copie ? 'Copié !' : site.adresse}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copie ? 'ok' : 'copier'}
          initial={{ scale: 0.4, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {copie ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}


// Carte du bento : apparition au défilement + halo qui suit la souris
function CarteBento({
  to,
  className,
  delai,
  children,
}: {
  to: string
  className?: string
  delai: number
  children: ReactNode
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const bouger = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${e.clientX - r.left}px`)
    el.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: delai, ease: douceur }}
    >
      <Link
        ref={ref}
        to={to}
        onMouseMove={bouger}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/30"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(420px circle at var(--x) var(--y), rgb(94 225 122 / 0.10), transparent 60%)' }}
        />
        {children}
      </Link>
    </motion.div>
  )
}

function Icone({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
      {children}
    </div>
  )
}

function Lien({ children }: { children: ReactNode }) {
  return (
    <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
      {children}
      <ArrowRight size={15} className="transition group-hover:translate-x-1" />
    </span>
  )
}

// Petit paysage de blocs en guise d'aperçu de la carte
function ApercuCarte() {
  const colonnes = 22
  const hauteurs = Array.from({ length: colonnes }, (_, i) =>
    Math.round(4 + Math.sin(i / 2.2) * 2 + Math.sin(i / 0.9) * 1.2 + (i > 14 ? 2 : 0)),
  )
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[62%] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/15 via-sky-400/5 to-transparent" />
      <motion.div
        className="absolute top-8 right-16 size-10 rounded-sm bg-amber-200/80 shadow-[0_0_60px_10px] shadow-amber-200/30"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end transition-transform duration-700 group-hover:scale-105">
        {hauteurs.map((h, i) => (
          <motion.div
            key={i}
            className="flex flex-1 flex-col"
            initial={{ y: 60, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.025, duration: 0.5, ease: douceur }}
          >
            <div className="aspect-square bg-[#5fbf3f] shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]" />
            {Array.from({ length: h }, (_, k) => (
              <div
                key={k}
                className={cn(
                  'aspect-square shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]',
                  k < 2 ? 'bg-[#7a5233]' : (i * 7 + k * 3) % 11 === 0 ? 'bg-[#5ce6e0]/80' : 'bg-[#6b7075]',
                )}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
