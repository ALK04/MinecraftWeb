import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Footprints, Hand, Mic, Pickaxe, Skull, Sparkles, Sword, ArrowBigUp } from 'lucide-react'
import { Chargement, Corps, Tete } from '@/components/communs'
import { useApi, type StatsJoueur } from '@/lib/api'
import { useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { cn, distance, duree, ecrireStockage, lireStockage, nombre } from '@/lib/utils'
import {
  A_LA_PLACE, DAUPHINS, HOROSCOPES, INTERVIEWS, STATS_BLAGUES, VERDICTS, duJour, numeroJour, remplir,
} from './textesStar'

type Reponse = {
  jour: string
  periode: 'hier' | 'aujourdhui' | 'total'
  star: { periode: StatsJoueur; total: StatsJoueur } | null
  dauphins: StatsJoueur[]
}

const CONFETTIS = ['#ffff55', '#6ee26a', '#6ff3fb', '#ff6b9d', '#ffffff', '#c77dff']

export default function StarDuJour() {
  const { data, erreur } = useApi<Reponse>('/api/joueur-du-jour')
  const { pluie, debloquer } = useJeu()
  const [flash, setFlash] = useState(0)
  const fete = useRef(false)

  // À l'arrivée : confettis, fanfare et flashs des photographes
  useEffect(() => {
    if (!data?.star || fete.current) return
    fete.current = true
    debloquer('paparazzi')
    sons.fanfare()
    pluie(CONFETTIS, 140)
    const ids = [300, 650, 900, 1500, 1750].map((t) => setTimeout(() => setFlash((f) => f + 1), t))
    return () => ids.forEach(clearTimeout)
  }, [data])

  if (erreur) return <main className="pt-32 text-center text-red-400">{erreur}</main>
  if (!data) return <main className="pt-32"><Chargement texte="On déroule le tapis rouge…" /></main>
  if (!data.star) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-32 text-center">
        <p className="ombre-mc font-pixel text-3xl">Pas de star aujourd'hui</p>
        <p className="mt-3 text-muted-foreground">Personne n'a joué. Tout le monde a une vie, apparemment. Inquiétant.</p>
      </main>
    )
  }

  const { periode: p, total } = data.star
  const j = numeroJour(data.jour)
  const h = p.tempsDeJeu / 3600
  const valeurs = {
    nom: p.nom,
    temps: duree(p.tempsDeJeu),
    h: h.toFixed(1),
    blocs: nombre(p.blocsMines),
    morts: nombre(p.morts),
    mobs: nombre(p.mobsTues),
    km: distance(p.distance),
    sauts: nombre(p.sauts),
  }
  const t = (texte: string) => remplir(texte, valeurs)
  const quand = { hier: 'hier', aujourdhui: "aujourd'hui", total: 'depuis toujours' }[data.periode]

  const aLaPlace = [0, 1, 2, 3]
    .map((k) => duJour(A_LA_PLACE, j, k, 4))
    .map((a) => ({ ...a, n: Math.max(1, Math.round(h * a.parHeure)) }))

  return (
    <main className="overflow-x-clip">
      {/* ---------- La scène ---------- */}
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-16 text-center sm:pt-32">
        {/* Projecteurs qui balaient la scène */}
        {[-1, 1].map((cote) => (
          <motion.div
            key={cote}
            aria-hidden
            className="absolute top-0 -z-10 h-[140%] w-[45%] origin-top bg-gradient-to-b from-[#fff6c8]/25 via-[#fff6c8]/5 to-transparent blur-sm [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]"
            style={{ left: cote < 0 ? '5%' : '50%' }}
            animate={{ rotate: cote < 0 ? [-25, 10, -25] : [25, -10, 25] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#5a1020]/40 to-transparent" />

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 font-pixel text-sm tracking-[0.3em] text-[#ffff55] uppercase"
        >
          ★ Star du jour ★
        </motion.p>
        <p className="mb-8 text-sm text-muted-foreground">
          {data.periode === 'total'
            ? "Pas encore assez d'historique : voici la légende de tous les temps."
            : `La personne qui a le plus joué ${quand}.`}
        </p>

        <div className="relative mx-auto w-fit">
          {/* Halo tournant derrière la star */}
          <motion.div
            aria-hidden
            className="absolute top-1/2 left-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,#ffff55,transparent_15%,#ff6b9d_30%,transparent_45%,#6ff3fb_60%,transparent_75%,#ffff55)] opacity-30 blur-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
          <Corps
            uuid={p.uuid}
            alt={p.nom}
            className="mx-auto h-64 drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] sm:h-80"
            initial={{ y: 200, opacity: 0, rotate: -10 }}
            animate={{ y: [0, -10, 0], opacity: 1, rotate: 0 }}
            transition={{ y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }, default: { type: 'spring', stiffness: 80, damping: 12 } }}
            whileHover={{ scale: 1.06, rotate: 4 }}
          />
          {/* Le tapis rouge */}
          <div className="mx-auto -mt-2 h-4 w-56 rounded-[50%] bg-[#b3122e] shadow-[0_0_40px_10px_rgba(179,18,46,0.35)]" />
        </div>

        <h1 className="ombre-mc mt-8 font-pixel text-5xl font-bold break-all sm:text-7xl">
          {p.nom.split('').map((l, i) => (
            <motion.span
              key={i}
              className="texte-brillant inline-block"
              initial={{ opacity: 0, scale: 3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05, type: 'spring', stiffness: 300, damping: 15 }}
            >
              {l}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="ombre-mc mt-3 font-pixel text-2xl text-white sm:text-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {duree(p.tempsDeJeu)} de jeu {quand}
        </motion.p>

        {/* Le verdict */}
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mx-auto mt-10 max-w-2xl rounded-3xl border border-[#ffff55]/25 bg-card px-6 py-5 text-lg text-pretty sm:text-xl"
        >
          {t(duJour(VERDICTS, j))}
        </motion.blockquote>

        <Applaudir nom={p.nom} jour={data.jour} />
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4">
        {/* ---------- Les chiffres ---------- */}
        <Section titre={`Le bilan ${data.periode === 'total' ? 'de toute une vie' : `d'${quand === 'hier' ? 'hier' : "aujourd'hui"}`}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CarteStat icone={Pickaxe} valeur={nombre(p.blocsMines)} nom="blocs minés" blague={t(duJour(STATS_BLAGUES.blocs, j))} i={0} />
            <CarteStat
              icone={Skull}
              valeur={nombre(p.morts)}
              nom="morts"
              blague={t(duJour(p.morts ? STATS_BLAGUES.morts : STATS_BLAGUES.zeroMort, j))}
              i={1}
            />
            <CarteStat icone={Sword} valeur={nombre(p.mobsTues)} nom="mobs tués" blague={t(duJour(STATS_BLAGUES.mobs, j))} i={2} />
            <CarteStat icone={Footprints} valeur={distance(p.distance)} nom="parcourus" blague={t(duJour(STATS_BLAGUES.distance, j))} i={3} />
            <CarteStat icone={ArrowBigUp} valeur={nombre(p.sauts)} nom="sauts" blague={t(duJour(STATS_BLAGUES.sauts, j))} i={4} />
            <CarteStat
              icone={Sparkles}
              valeur={duree(total.tempsDeJeu)}
              nom="au total, depuis le début"
              blague="Ça fait beaucoup. Vraiment beaucoup."
              i={5}
            />
          </div>
        </Section>

        {/* ---------- Ce qu'il aurait pu faire ---------- */}
        <Section titre={`Avec ce temps, ${p.nom} aurait pu…`}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {aLaPlace.map((a, i) => (
              <motion.li
                key={a.texte}
                initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
              >
                <span className="size-3 shrink-0 bg-primary shadow-[0_0_10px] shadow-primary/60" />
                <span className="text-muted-foreground">
                  {a.texte.split('{n}')[0]}
                  <b className="ombre-mc font-pixel text-xl text-primary">{nombre(a.n)}</b>
                  {a.texte.split('{n}')[1]}
                </span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-muted-foreground">Au lieu de ça : des blocs. Que des blocs.</p>
        </Section>

        {/* ---------- Interview ---------- */}
        <Section titre="Interview exclusive">
          <div className="space-y-3">
            {[0, 1, 2].map((k) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: k * 0.12 }}
                className={cn('flex items-end gap-3', k % 2 && 'flex-row-reverse')}
              >
                <Tete uuid={p.uuid} nom={p.nom} taille={40} />
                <div
                  className={cn(
                    'max-w-md rounded-3xl border border-border bg-card px-5 py-3 text-pretty',
                    k % 2 ? 'rounded-br-md' : 'rounded-bl-md',
                  )}
                >
                  {duJour(INTERVIEWS, j, k, 3)}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Mic size={12} /> Propos totalement inventés. Mais crédibles.
          </p>
        </Section>

        {/* ---------- Horoscope + dauphins ---------- */}
        <div className="grid gap-6 md:grid-cols-2">
          <Section titre="Horoscope du bloc">
            <div className="rounded-3xl border border-[#c77dff]/30 bg-[#c77dff]/10 p-6 font-pixel text-pretty text-[#e8d4ff]">
              ✦ {duJour(HOROSCOPES, j)}
            </div>
          </Section>
          {data.dauphins.length > 0 && (
            <Section titre="Les dauphins">
              <ul className="space-y-2">
                {data.dauphins.map((d, i) => (
                  <li key={d.uuid} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                    <span className={cn('font-pixel', i ? 'text-orange-300' : 'text-slate-200')}>{i + 2}</span>
                    <Tete uuid={d.uuid} nom={d.nom} taille={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{remplir(duJour(DAUPHINS, j, i, 2), { nom: d.nom })}</p>
                      <p className="text-xs text-muted-foreground">{duree(d.tempsDeJeu)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Nouvelle star (et nouveaux messages) chaque jour à minuit. Toute ressemblance avec la réalité est… totalement
          voulue.
        </p>
      </div>

      {/* Flashs des photographes */}
      <AnimatePresence>
        {flash > 0 && (
          <motion.div
            key={flash}
            className="pointer-events-none fixed inset-0 z-[80] bg-white"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="ombre-mc mb-5 font-pixel text-2xl sm:text-3xl">{titre}</h2>
      {children}
    </section>
  )
}

function CarteStat({
  icone: Icone,
  valeur,
  nom,
  blague,
  i,
}: {
  icone: typeof Pickaxe
  valeur: string
  nom: string
  blague: string
  i: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, rotate: i % 2 ? 1 : -1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: (i % 3) * 0.07 }}
      className="rounded-3xl border border-border bg-card p-5"
    >
      <Icone size={20} className="mb-3 text-primary" />
      <p className="ombre-mc font-pixel text-3xl">{valeur}</p>
      <p className="text-sm text-muted-foreground">{nom}</p>
      <p className="mt-3 text-sm text-pretty text-[#ffff55]/90">{blague}</p>
    </motion.div>
  )
}

// Bouton d'applaudissements (compteur personnel, remis à zéro chaque jour)
function Applaudir({ nom, jour }: { nom: string; jour: string }) {
  const { eclats } = useJeu()
  const cle = `bravo-${jour}`
  const [n, setN] = useState(() => Number(lireStockage(cle) || 0))
  const applaudir = (e: MouseEvent) => {
    const v = n + 1
    setN(v)
    ecrireStockage(cle, String(v))
    sons.bois()
    eclats(e.clientX, e.clientY, CONFETTIS, 14, 6)
  }
  return (
    <div className="mt-8">
      <motion.button
        onClick={applaudir}
        whileTap={{ scale: 0.88, rotate: -8 }}
        whileHover={{ scale: 1.05 }}
        className="inline-flex items-center gap-2 rounded-full bg-[#ffff55] px-6 py-3 font-pixel text-[#2a2a05] shadow-[0_0_30px_-4px_rgba(255,255,85,0.7)]"
      >
        <Hand size={18} /> Applaudir {nom}
      </motion.button>
      <AnimatePresence mode="wait">
        <motion.p
          key={n}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-3 text-sm text-muted-foreground"
        >
          {n === 0
            ? 'Personne ne force personne. Mais quand même.'
            : n < 10
              ? `${n} applaudissement${n > 1 ? 's' : ''}. C'est mérité (non).`
              : n < 50
                ? `${n} applaudissements. Calme-toi.`
                : `${n} applaudissements. Tu es fan. Assume.`}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
