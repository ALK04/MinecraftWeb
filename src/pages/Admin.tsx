import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, Gem, KeyRound, LogOut, Map, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { Bouton, EnTete, Tete, champ } from '@/components/communs'
import { api, ErreurApi } from '@/lib/api'
import { cn, duree, nombre } from '@/lib/utils'

// Espace admin : détection de X-ray à partir des stats Minecraft.
// Pas dans le menu : on y va directement par https://mc.secteur-3.fr/admin

type Rapport = {
  uuid: string
  nom: string
  tempsDeJeu: number
  pierre: number
  nether: number
  minerais: Record<string, number>
  diamantPour1000: number | null
  debrisPour1000: number | null
  indiceDiamant: number | null
  indiceDebris: number | null
  verdict: 'ok' | 'surveiller' | 'suspect' | 'pas_assez'
  ledger: Ledger | null
}

// Analyse du journal Ledger (voir server/ledger.ts)
type AnalyseMinerai = {
  filons: number
  decouverts: number
  creuses: number
  roche: number
  blocsParFilon: number | null
  indice: number | null
}
type Filon = {
  type: 'diamant' | 'debris'
  x: number
  y: number
  z: number
  le: string
  blocs: number
  decouvert: boolean
  creuseAvant: number
  chemin: [number, number, number][]
}
type Ledger = { diamant: AnalyseMinerai; debris: AnalyseMinerai; derniers: Filon[] }
type Reponse = { reference: { diamant: number; debris: number }; minimum: { pierre: number; nether: number }; joueurs: Rapport[] }

const VERDICTS = {
  suspect: { nom: 'Suspect', icone: ShieldAlert, classe: 'border-red-400/40 bg-red-500/10 text-red-300' },
  surveiller: { nom: 'À surveiller', icone: Eye, classe: 'border-amber-300/40 bg-amber-300/10 text-amber-200' },
  ok: { nom: 'Normal', icone: ShieldCheck, classe: 'border-primary/40 bg-primary/10 text-primary' },
  pas_assez: { nom: 'Pas assez minés', icone: ShieldQuestion, classe: 'border-border bg-muted text-muted-foreground' },
}

const NOMS_MINERAIS: Record<string, [string, string]> = {
  diamant: ['Diamant', '#6ff3fb'],
  debris: ['Débris antiques', '#a0715a'],
  emeraude: ['Émeraude', '#2bf074'],
  or: ['Or', '#fcee4b'],
  fer: ['Fer', '#e2b89c'],
  lapis: ['Lapis', '#4a6ff0'],
  redstone: ['Redstone', '#ff3030'],
}

const CLE = 'admin-mdp'
const lire = () => {
  try {
    return sessionStorage.getItem(CLE) ?? ''
  } catch {
    return ''
  }
}
const ecrire = (v: string) => {
  try {
    if (v) sessionStorage.setItem(CLE, v)
    else sessionStorage.removeItem(CLE)
  } catch {
    /* tant pis */
  }
}

export default function Admin() {
  const [mdp, setMdp] = useState(lire)
  const [data, setData] = useState<Reponse | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [charge, setCharge] = useState(false)

  const charger = async (m = mdp) => {
    setCharge(true)
    try {
      setData(await api<Reponse>('/api/admin/xray', { headers: { 'x-admin': m } }))
      setErreur(null)
      ecrire(m)
      setMdp(m)
    } catch (e) {
      setErreur((e as Error).message)
      if (e instanceof ErreurApi && e.status === 403) {
        ecrire('')
        setMdp('')
      }
    }
    setCharge(false)
  }

  useEffect(() => {
    if (mdp) void charger()
  }, [])

  if (!mdp || !data) {
    return <Connexion erreur={erreur} charge={charge} valider={(m) => void charger(m)} />
  }

  const suspects = data.joueurs.filter((j) => j.verdict === 'suspect').length

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Espace admin" titre="Détecteur de X-ray">
        <div className="flex gap-2">
          <Bouton variante="secondaire" onClick={() => void charger()} disabled={charge}>
            <RefreshCw size={15} className={cn(charge && 'animate-spin')} /> Actualiser
          </Bouton>
          <Bouton
            variante="fantome"
            onClick={() => {
              ecrire('')
              setMdp('')
              setData(null)
            }}
          >
            <LogOut size={15} /> Sortir
          </Bouton>
        </div>
      </EnTete>

      {/* Explication */}
      <div className="mb-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="mb-2 font-pixel text-base text-foreground">Comment lire l'indice ?</p>
          <p>
            Un joueur honnête casse beaucoup de pierre pour trouver un diamant. Avec un X-ray, il creuse droit vers les
            minerais. L'indice compare ses trouvailles à un minage normal (environ {data.reference.diamant} diamants pour
            1 000 pierres, {data.reference.debris} débris pour 1 000 blocs du Nether).
          </p>
          <ul className="mt-3 space-y-1">
            <li><b className="text-primary">≈ 1</b> : normal</li>
            <li><b className="text-amber-200">2 à 3</b> : chanceux… ou à surveiller</li>
            <li><b className="text-red-300">plus de 3</b> : suspect</li>
          </ul>
          <p className="mt-3 text-xs">
            Ce n'est qu'un indice. Ouvre la fiche d'un joueur pour voir son journal : comment il a trouvé chaque filon (à découvert ou en creusant) et le tunnel creusé juste avant. Toujours vérifier en jeu
            avant d'accuser quelqu'un. Jugé à partir de {nombre(data.minimum.pierre)} pierres cassées.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Chiffre valeur={data.joueurs.length} nom="joueurs analysés" />
          <Chiffre valeur={suspects} nom="suspects" rouge={suspects > 0} />
          <a
            href="/carte/"
            target="_blank"
            rel="noreferrer"
            className="col-span-2 flex items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 text-sm font-semibold transition hover:border-primary/40"
          >
            <Map size={16} /> Ouvrir la carte du monde
          </a>
        </div>
      </div>

      {data.joueurs.length === 0 && <p className="py-16 text-center text-muted-foreground">Aucune statistique pour l'instant.</p>}

      <div className="space-y-3">
        {data.joueurs.map((j, i) => (
          <LigneJoueur key={j.uuid} j={j} i={i} />
        ))}
      </div>
    </main>
  )
}

function Connexion({ erreur, charge, valider }: { erreur: string | null; charge: boolean; valider: (m: string) => void }) {
  const [m, setM] = useState('')
  const soumettre = (e: FormEvent) => {
    e.preventDefault()
    if (m) valider(m)
  }
  return (
    <main className="grid min-h-[80dvh] place-items-center px-4 pt-14 sm:pt-24">
      <motion.form
        onSubmit={soumettre}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <KeyRound size={20} />
          </span>
          <div>
            <p className="font-pixel text-lg">Espace admin</p>
            <p className="text-xs text-muted-foreground">Réservé à l'admin du serveur</p>
          </div>
        </div>
        <input
          autoFocus
          type="password"
          value={m}
          onChange={(e) => setM(e.target.value)}
          placeholder="Mot de passe"
          className={champ}
        />
        <AnimatePresence>
          {erreur && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-sm text-red-300"
            >
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>
        <Bouton type="submit" disabled={!m || charge} className="mt-4 w-full">
          Entrer
        </Bouton>
      </motion.form>
    </main>
  )
}

function Chiffre({ valeur, nom, rouge }: { valeur: number; nom: string; rouge?: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 text-center">
      <p className={cn('ombre-mc font-pixel text-3xl', rouge ? 'text-red-300' : 'text-foreground')}>{valeur}</p>
      <p className="text-xs text-muted-foreground">{nom}</p>
    </div>
  )
}

function LigneJoueur({ j, i }: { j: Rapport; i: number }) {
  const v = VERDICTS[j.verdict]
  const [ouvert, setOuvert] = useState(j.verdict === 'suspect')
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn('overflow-hidden rounded-3xl border bg-card', j.verdict === 'suspect' ? 'border-red-400/40' : 'border-border')}
    >
      <button onClick={() => setOuvert((o) => !o)} className="flex w-full flex-wrap items-center gap-4 p-4 text-left">
        <Tete uuid={j.uuid} nom={j.nom} taille={40} />
        <div className="min-w-32 flex-1">
          <p className="font-semibold">{j.nom}</p>
          <p className="text-xs text-muted-foreground">{duree(j.tempsDeJeu)} de jeu · {nombre(j.pierre)} pierres cassées</p>
        </div>
        {/* Avec le journal Ledger : l'indice précis ; sinon l'estimation par les stats */}
        <Jauge nom="Diamants" indice={j.ledger ? j.ledger.diamant.indice : j.indiceDiamant} />
        <Jauge nom="Débris" indice={j.ledger ? j.ledger.debris.indice : j.indiceDebris} />
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', v.classe)}>
          <v.icone size={14} /> {v.nom}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-[1fr_1fr]">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {Object.entries(NOMS_MINERAIS).map(([cle, [nom, couleur]]) => (
                  <div key={cle} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                    <span className="size-2.5 shrink-0" style={{ background: couleur, boxShadow: `0 0 8px ${couleur}` }} />
                    <span className="flex-1 truncate text-muted-foreground">{nom}</span>
                    <b className="tabular-nums">{nombre(j.minerais[cle] ?? 0)}</b>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p>
                  <Gem size={13} className="mr-1 inline text-[#6ff3fb]" />
                  {j.diamantPour1000 === null ? 'Aucune pierre cassée.' : `${j.diamantPour1000} diamants pour 1 000 pierres (normal : ~4).`}
                </p>
                <p>
                  {j.debrisPour1000 === null
                    ? 'Pas encore allé miner dans le Nether.'
                    : `${j.debrisPour1000} débris pour 1 000 blocs du Nether (${nombre(j.nether)} cassés).`}
                </p>
                {j.verdict === 'pas_assez' && (
                  <p className="text-xs">Pas encore assez de blocs minés pour juger : l'indice apparaîtra plus tard.</p>
                )}
                {j.ledger && <p className="text-xs">(Estimation par les stats, moins fiable que le journal ci-dessous.)</p>}
              </div>
            </div>
            {j.ledger && <Journal l={j.ledger} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ------------------------------------------------------------------
// Le journal Ledger : résumé + les derniers filons, avec le tunnel creusé avant
// ------------------------------------------------------------------
function Journal({ l }: { l: Ledger }) {
  return (
    <div className="border-t border-border p-4">
      <p className="mb-3 font-pixel text-sm">Journal des blocs (Ledger)</p>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Resume nom="Diamants" couleur="#6ff3fb" a={l.diamant} normal={120} />
        <Resume nom="Débris antiques" couleur="#a0715a" a={l.debris} normal={80} />
      </div>
      {l.derniers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun diamant ni débris trouvé pour l'instant.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Derniers filons. Le dessin montre, vu de dessus, les blocs creusés dans les 5 minutes avant la découverte (du
            plus ancien, pâle, au plus récent). Un trait droit qui fonce sur le minerai, filon après filon : X-ray probable.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {l.derniers.map((f, i) => (
              <CarteFilon key={`${f.le}-${i}`} f={f} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Resume({ nom, couleur, a, normal }: { nom: string; couleur: string; a: AnalyseMinerai; normal: number }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3 text-sm">
      <p className="mb-1 flex items-center gap-2 font-semibold">
        <span className="size-2.5" style={{ background: couleur, boxShadow: `0 0 8px ${couleur}` }} />
        {nom} : {a.filons} filon{a.filons > 1 ? 's' : ''}
      </p>
      <p className="text-muted-foreground">
        {a.decouverts} à découvert (grottes) · {a.creuses} en creusant
      </p>
      <p className="text-muted-foreground">
        {a.blocsParFilon === null ? (
          'Aucun filon trouvé en creusant.'
        ) : (
          <>
            <b className="text-foreground">{nombre(a.blocsParFilon)}</b> blocs creusés par filon (normal : {normal} et plus)
          </>
        )}
      </p>
      {a.indice === null && a.creuses > 0 && <p className="text-xs text-muted-foreground">Indice à partir de 3 filons creusés.</p>}
    </div>
  )
}

function CarteFilon({ f }: { f: Filon }) {
  const [copie, setCopie] = useState(false)
  const tp = `/tp ${f.x} ${f.y + 1} ${f.z}`
  const couleur = f.type === 'diamant' ? '#6ff3fb' : '#c08a6a'
  const date = new Date(f.le).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-background/40 p-2.5">
      {/* Vue de dessus : 33 × 33 blocs centrés sur le filon */}
      <svg viewBox="-16.5 -16.5 33 33" className="size-20 shrink-0 rounded-lg bg-[#1a1c22]" aria-label="Blocs creusés avant la découverte">
        {f.chemin.map(([dx, dz, age], k) => (
          <rect key={k} x={dx - 0.5} y={dz - 0.5} width={1} height={1} fill="#9aa0a6" opacity={0.15 + age * 0.75} />
        ))}
        <rect x={-0.9} y={-0.9} width={1.8} height={1.8} fill={couleur} />
      </svg>
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-semibold text-foreground">
          {f.type === 'diamant' ? 'Diamants' : 'Débris'} ×{f.blocs}
          <span
            className={cn(
              'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
              f.decouvert ? 'bg-primary/15 text-primary' : 'bg-amber-300/15 text-amber-200',
            )}
          >
            {f.decouvert ? 'à découvert' : `creusé (${f.creuseAvant} blocs)`}
          </span>
        </p>
        <p className="mt-0.5 text-muted-foreground">{date}</p>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(tp)
            setCopie(true)
            setTimeout(() => setCopie(false), 1500)
          }}
          className="mt-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
          title="Copier la commande pour s'y téléporter en jeu"
        >
          {copie ? 'Copié !' : tp}
        </button>
      </div>
    </div>
  )
}

// Petite jauge : le trait marque 1 (normal), la barre se remplit jusqu'à 5
function Jauge({ nom, indice }: { nom: string; indice: number | null }) {
  const couleur = indice === null ? 'bg-muted-foreground' : indice > 3 ? 'bg-red-400' : indice > 2 ? 'bg-amber-300' : 'bg-primary'
  return (
    <div className="w-28">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{nom}</span>
        <b className="font-pixel text-foreground">{indice === null ? '—' : `×${indice}`}</b>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        {indice !== null && (
          <motion.div
            className={cn('h-full rounded-full', couleur)}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (indice / 5) * 100)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        <span className="absolute inset-y-0 left-[20%] w-0.5 bg-white/60" title="Normal" />
      </div>
    </div>
  )
}
