import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Check, Compass, Gem, Hammer, Hand, KeyRound, Pencil, Plus, RotateCcw, Sparkles, Sword, Trash2, Undo2, User, Wheat,
  type LucideIcon,
} from 'lucide-react'
import { Bouton, Chargement, EnTete, Modale, Tete, champ } from '@/components/communs'
import { api, ErreurApi, useApi, type Joueur, type Objectif, type ReponseObjectifs } from '@/lib/api'
import { cn, ecrireStockage, ilYa, lireStockage } from '@/lib/utils'
import { useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'

const CATEGORIES: Record<string, { nom: string; icone: LucideIcon; classe: string }> = {
  construction: { nom: 'Construction', icone: Hammer, classe: 'text-amber-300 bg-amber-300/10 border-amber-300/20' },
  exploration: { nom: 'Exploration', icone: Compass, classe: 'text-sky-300 bg-sky-300/10 border-sky-300/20' },
  ferme: { nom: 'Ferme', icone: Wheat, classe: 'text-lime-300 bg-lime-300/10 border-lime-300/20' },
  combat: { nom: 'Combat', icone: Sword, classe: 'text-red-300 bg-red-300/10 border-red-300/20' },
  collecte: { nom: 'Collecte', icone: Gem, classe: 'text-violet-300 bg-violet-300/10 border-violet-300/20' },
  autre: { nom: 'Autre', icone: Sparkles, classe: 'text-slate-300 bg-slate-300/10 border-slate-300/20' },
}

const PSEUDO = /^[A-Za-z0-9_]{1,16}$/
type Action = 'prendre' | 'lacher' | 'terminer' | 'rouvrir'

export default function Objectifs() {
  const { data, erreur, recharger } = useApi<ReponseObjectifs>('/api/objectifs', 20_000)
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')
  // Pseudo (partagé avec les succès) et code, gardés dans le navigateur
  const { eclats, orbes, debloquer, pseudo, setPseudo } = useJeu()
  const codeRef = useRef(lireStockage('code-objectifs'))

  const [fenetre, setFenetre] = useState<null | 'pseudo' | 'code' | 'nouveau'>(null)
  const enAttente = useRef<((p: string) => void) | null>(null)
  const [filtre, setFiltre] = useState<string>('tout')
  const [message, setMessage] = useState<string | null>(null)
  const [selection, setSelection] = useState<number | null>(null)
  const [enDirect, setEnDirect] = useState(false)
  const [annonce, setAnnonce] = useState<string | null>(null)

  // Temps réel : le serveur prévient dès que le mur change
  const rechargerRef = useRef(recharger)
  rechargerRef.current = recharger
  useEffect(() => {
    const flux = new EventSource('/api/objectifs/flux')
    flux.onopen = () => setEnDirect(true)
    flux.onerror = () => setEnDirect(false)
    flux.onmessage = () => void rechargerRef.current()
    return () => flux.close()
  }, [])

  // Un panneau planté par quelqu'un d'autre ? On l'annonce.
  const connus = useRef<Set<number> | null>(null)
  useEffect(() => {
    if (!data) return
    const ids = new Set(data.objectifs.map((o) => o.id))
    if (connus.current) {
      const nouveau = data.objectifs.find((o) => !connus.current!.has(o.id) && o.cree_par !== pseudo)
      if (nouveau) {
        sons.bois()
        setAnnonce(`${nouveau.cree_par} vient de planter un panneau !`)
        setTimeout(() => setAnnonce(null), 3500)
      }
    }
    connus.current = ids
  }, [data, pseudo])

  const afficher = (m: string) => {
    setMessage(m)
    setTimeout(() => setMessage((x) => (x === m ? null : x)), 3000)
  }

  // Lance `faire` avec le pseudo ; demande le pseudo d'abord s'il manque
  const avecPseudo = (faire: (p: string) => void) => {
    if (pseudo) return faire(pseudo)
    enAttente.current = faire
    setFenetre('pseudo')
  }

  async function ecrire(url: string, method: string, corps?: unknown): Promise<boolean> {
    try {
      await api(url, {
        method,
        headers: { 'content-type': 'application/json', 'x-code': codeRef.current },
        body: corps ? JSON.stringify(corps) : undefined,
      })
      await recharger()
      return true
    } catch (e) {
      if (e instanceof ErreurApi && e.status === 403) {
        codeRef.current = ''
        ecrireStockage('code-objectifs', '')
        enAttente.current = () => void ecrire(url, method, corps)
        setFenetre('code')
      } else {
        afficher((e as Error).message)
      }
      return false
    }
  }

  const agir = (o: Objectif, action: Action, x = innerWidth / 2, y = innerHeight / 2) =>
    avecPseudo(async (p) => {
      const ok = await ecrire(`/api/objectifs/${o.id}`, 'PATCH', { pseudo: p, action })
      if (ok && action === 'terminer') {
        eclats(x, y, ['#6ee26a', '#ffff55', '#5ce6e0', '#ff6b9d', '#ffffff'], 60, 11)
        orbes(x, y, 8)
        debloquer('objectif')
      } else if (ok) {
        sons.bois()
      }
    })

  const supprimer = (o: Objectif) => void ecrire(`/api/objectifs/${o.id}`, 'DELETE')

  const objectifs = (data?.objectifs ?? []).filter((o) =>
    filtre === 'tout' ? true : filtre === 'moi' ? o.pour === pseudo || o.pris_par === pseudo : o.categorie === filtre,
  )

  const ouvert = selection !== null ? (data?.objectifs ?? []).find((o) => o.id === selection) ?? null : null

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Plante un panneau, quelqu'un s'en occupera (peut-être)" titre="Le mur des objectifs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFenetre('pseudo')}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-1.5 text-sm font-semibold transition hover:border-primary/40"
          >
            {pseudo ? (
              <Tete uuid={uuidDe(joueurs, pseudo)} nom={pseudo} taille={26} />
            ) : (
              <span className="grid size-[26px] place-items-center rounded-md bg-muted">
                <User size={14} />
              </span>
            )}
            {pseudo || 'Qui es-tu ?'}
            <Pencil size={12} className="text-muted-foreground" />
          </button>
          <Bouton onClick={() => avecPseudo(() => setFenetre('nouveau'))}>
            <Plus size={16} strokeWidth={3} /> Planter un panneau
          </Bouton>
        </div>
      </EnTete>

      {/* Filtres */}
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[
          ['tout', 'Tout'],
          ...(pseudo ? [['moi', 'Pour moi']] : []),
          ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.nom]),
        ].map(([cle, nom]) => (
          <button
            key={cle}
            onClick={() => setFiltre(cle)}
            className={cn(
              'relative rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition',
              filtre === cle
                ? 'border-primary/50 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {filtre === cle && (
              <motion.span layoutId="filtre" className="absolute inset-0 rounded-full bg-primary/10" />
            )}
            <span className="relative">{nom}</span>
          </button>
        ))}
      </div>

      {erreur && !data && <p className="text-center text-red-400">{erreur}</p>}
      {!data && !erreur && <Chargement />}

      {data && (
        <Mur joueurs={joueurs}>
          <AnimatePresence mode="popLayout">
            {objectifs.map((o) => (
              <PanneauMural key={o.id} o={o} joueurs={joueurs} ouvrir={() => setSelection(o.id)} />
            ))}
          </AnimatePresence>
          {objectifs.length === 0 && (
            <PanneauVide
              texte={filtre === 'tout' ? ['Le mur est vide.', '', 'Plante le', 'premier panneau !'] : ['Rien ici.', '', 'Change de', 'filtre ?']}
            />
          )}
        </Mur>
      )}
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className={cn('size-2 rounded-full', enDirect ? 'animate-pulse bg-primary' : 'bg-muted-foreground')} />
        {enDirect ? 'En direct : les nouveaux panneaux apparaissent tout seuls.' : 'Connexion au direct…'}
      </p>

      {/* Le panneau ouvert en grand, avec les actions */}
      <Modale ouverte={ouvert !== null} fermer={() => setSelection(null)} titre="Le panneau">
        {ouvert && (
          <DetailPanneau
            o={ouvert}
            pseudo={pseudo}
            joueurs={joueurs}
            agir={(a, x, y) => {
              agir(ouvert, a, x, y)
              if (a === 'terminer') setSelection(null)
            }}
            supprimer={() => {
              supprimer(ouvert)
              setSelection(null)
            }}
          />
        )}
      </Modale>


      {/* --- Fenêtres --- */}
      <Modale ouverte={fenetre === 'pseudo'} fermer={() => setFenetre(null)} titre="Ton pseudo Minecraft">
        <FormPseudo
          initial={pseudo}
          joueurs={joueurs ?? []}
          valider={(p) => {
            setPseudo(p)
            setFenetre(null)
            const suite = enAttente.current
            enAttente.current = null
            suite?.(p)
          }}
        />
      </Modale>

      <Modale ouverte={fenetre === 'code'} fermer={() => setFenetre(null)} titre="Code d'accès">
        <FormCode
          valider={async (code) => {
            try {
              await api('/api/objectifs/code', { method: 'POST', headers: { 'x-code': code } })
            } catch (e) {
              return (e as Error).message
            }
            codeRef.current = code
            ecrireStockage('code-objectifs', code)
            setFenetre(null)
            const suite = enAttente.current
            enAttente.current = null
            suite?.(pseudo)
            return null
          }}
        />
      </Modale>

      <Modale ouverte={fenetre === 'nouveau'} fermer={() => setFenetre(null)} titre="Planter un panneau">
        <FormNouveau
          joueurs={joueurs ?? []}
          valider={async (champs) => {
            const ok = await ecrire('/api/objectifs', 'POST', { ...champs, auteur: pseudo })
            if (ok) setFenetre(null)
          }}
        />
      </Modale>

      {/* Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[70] rounded-full border border-red-400/30 bg-card px-5 py-2.5 text-sm text-red-300 shadow-xl sm:bottom-8"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {annonce && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: '-50%', rotate: -6 }}
            animate={{ opacity: 1, y: 0, x: '-50%', rotate: -2 }}
            exit={{ opacity: 0, y: -30, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[70] border-[3px] border-[#5b3d1f] px-5 py-2.5 font-pixel text-sm text-[#2a1a08] sm:top-24"
            style={BOIS}
          >
            {annonce}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

const uuidDe = (joueurs: Joueur[] | null, nom: string) =>
  joueurs?.find((j) => j.nom.toLowerCase() === nom.toLowerCase())?.uuid ?? nom

// ------------------------------------------------------------------

// Toujours la même petite inclinaison pour le même panneau
const inclinaison = (id: number) => ((id * 37) % 9) - 4

const BOIS = {
  background: 'repeating-linear-gradient(0deg, #b8915c 0 9px, #a98353 9px 11px, #be9862 11px 20px, #a37c4c 20px 22px)',
  boxShadow: 'inset 0 0 0 2px #d1ad75, inset 0 -4px 0 #8c6a3e, 0 12px 24px rgba(0,0,0,0.5)',
}

// Le mur en briques de pierre, avec deux torches et quelques graffitis
function Mur({ joueurs, children }: { joueurs: Joueur[] | null; children: ReactNode }) {
  const tags = useMemo(() => {
    const noms = (joueurs ?? []).map((j) => j.nom)
    const n = (i: number) => noms[i % Math.max(1, noms.length)] ?? 'Steve'
    return [`${n(0)} était là`, 'pas de griefing !!', `${n(1)} + diamants = ♥`, 'ne creusez pas ici', 'zzz']
  }, [joueurs])

  return (
    <div
      className="relative overflow-hidden rounded-3xl border-[10px] border-[#4a3118] p-5 shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_20px_50px_rgba(0,0,0,0.5)] sm:p-10"
      style={{
        backgroundColor: '#6f747b',
        backgroundImage: [
          // joints horizontaux
          'linear-gradient(#4d5157 2px, transparent 2px)',
          // joints verticaux, décalés une rangée sur deux
          'linear-gradient(90deg, #4d5157 2px, transparent 2px)',
          'linear-gradient(90deg, #4d5157 2px, transparent 2px)',
          // reflets sur les briques
          'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%)',
        ].join(','),
        backgroundSize: '64px 32px, 64px 64px, 64px 64px, 64px 32px',
        backgroundPosition: '0 0, 0 0, 32px 32px, 0 0',
      }}
    >
      {/* Graffitis à la craie */}
      {tags.map((t, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute font-pixel text-xs whitespace-nowrap text-white/15 sm:text-sm"
          style={{
            top: `${[8, 46, 78, 25, 92][i]}%`,
            left: `${[62, 4, 70, 30, 8][i]}%`,
            transform: `rotate(${[-8, 6, -4, 10, -12][i]}deg)`,
          }}
        >
          {t}
        </span>
      ))}
      {/* Torches */}
      {['left-3', 'right-3'].map((c) => (
        <div key={c} aria-hidden className={cn('pointer-events-none absolute top-4 hidden flex-col items-center sm:flex', c)}>
          <motion.span
            className="block size-3 bg-[#ffd34a] shadow-[0_0_30px_14px_rgba(255,180,60,0.45)]"
            animate={{ scale: [1, 1.2, 0.9, 1.1, 1], opacity: [1, 0.85, 1, 0.9, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
          <span className="h-7 w-2 bg-[#6b4a28]" />
        </div>
      ))}
      <div className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">{children}</div>
    </div>
  )
}

function Clou() {
  return <span className="absolute -top-1.5 left-1/2 z-10 size-2.5 -translate-x-1/2 bg-[#9aa0a6] shadow-[inset_-2px_-2px_0_#5a5e62]" />
}

function PanneauMural({ o, joueurs, ouvrir }: { o: Objectif; joueurs: Joueur[] | null; ouvrir: () => void }) {
  const cat = CATEGORIES[o.categorie] ?? CATEGORIES.autre
  const Icone = cat.icone
  const r = inclinaison(o.id)
  const fait = o.statut === 'fait'

  return (
    <motion.button
      layout
      onClick={ouvrir}
      initial={{ opacity: 0, y: -80, rotate: r - 25, scale: 1.2 }}
      animate={{ opacity: 1, y: 0, rotate: r, scale: 1 }}
      exit={{ opacity: 0, y: 160, rotate: r + 50, transition: { duration: 0.5, ease: 'easeIn' } }}
      whileHover={{ rotate: 0, scale: 1.06, y: -4, zIndex: 20 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 15 }}
      className="relative text-left"
    >
      <Clou />
      <div
        className={cn('relative flex aspect-[3/2] flex-col border-[3px] border-[#5b3d1f] p-2.5 sm:p-3', fait && 'saturate-50')}
        style={BOIS}
      >
        <p className="line-clamp-4 flex-1 text-center font-pixel text-[11px] leading-snug break-words text-[#2a1a08] sm:text-[13px]">
          {o.titre}
        </p>
        <div className="mt-1 flex items-center justify-between text-[#4a3118]">
          <Icone size={13} strokeWidth={2.5} />
          {o.pour && <span className="truncate font-pixel text-[10px]">→ {o.pour}</span>}
        </div>

        {/* Tampon « FAIT ! » */}
        {fait && (
          <motion.span
            initial={{ scale: 3, opacity: 0, rotate: -40 }}
            animate={{ scale: 1, opacity: 1, rotate: -14 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            className="absolute inset-0 m-auto grid h-fit w-fit place-items-center rounded-md border-[3px] border-[#1f8a2a] bg-[#d9ffd2]/80 px-3 py-0.5 font-pixel text-lg font-bold text-[#1f8a2a] shadow-lg sm:text-xl"
          >
            FAIT !
          </motion.span>
        )}
      </div>

      {/* Étiquette « untel s'en occupe » qui pend sous le panneau */}
      {o.statut === 'en_cours' && o.pris_par && (
        <motion.div
          initial={{ rotate: -20, opacity: 0 }}
          animate={{ rotate: [6, -6, 6], opacity: 1 }}
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          style={{ originY: 0 }}
          className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-sm bg-[#ffff55] px-2 py-0.5 font-pixel text-[10px] whitespace-nowrap text-[#3a3a05] shadow-md"
        >
          <Tete uuid={uuidDe(joueurs, o.pris_par)} nom={o.pris_par} taille={14} className="rounded-none" />
          {o.pris_par} s'en occupe
        </motion.div>
      )}
    </motion.button>
  )
}

function PanneauVide({ texte }: { texte: string[] }) {
  return (
    <div className="relative col-span-full mx-auto w-56 -rotate-2">
      <Clou />
      <div className="flex aspect-[3/2] flex-col items-center justify-center border-[3px] border-[#5b3d1f] font-pixel text-[13px] text-[#2a1a08]" style={BOIS}>
        {texte.map((l, i) => (
          <span key={i} className="min-h-[1.4em]">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

function DetailPanneau({
  o,
  pseudo,
  joueurs,
  agir,
  supprimer,
}: {
  o: Objectif
  pseudo: string
  joueurs: Joueur[] | null
  agir: (a: Action, x?: number, y?: number) => void
  supprimer: () => void
}) {
  const cat = CATEGORIES[o.categorie] ?? CATEGORIES.autre
  const Icone = cat.icone
  const [confirmer, setConfirmer] = useState(false)

  return (
    <div>
      <div className="relative mb-5 border-[3px] border-[#5b3d1f] px-4 py-6 text-center" style={BOIS}>
        <p className="font-pixel text-base leading-relaxed break-words text-[#2a1a08]">{o.titre}</p>
      </div>
      {o.description && <p className="mb-4 text-sm whitespace-pre-line text-muted-foreground">{o.description}</p>}

      <div className="mb-5 flex flex-wrap gap-1.5 text-xs">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold', cat.classe)}>
          <Icone size={12} /> {cat.nom}
        </span>
        {o.pour && (
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            pour <b className="text-foreground">{o.pour}</b>
          </span>
        )}
        <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
          planté par <b className="text-foreground">{o.cree_par}</b> {ilYa(o.cree_le)}
        </span>
      </div>

      {o.statut === 'en_cours' && o.pris_par && (
        <p className="mb-4 flex items-center gap-2 text-sm">
          <Tete uuid={uuidDe(joueurs, o.pris_par)} nom={o.pris_par} taille={22} />
          <span>
            <b className="text-[#ffff55]">{o.pris_par}</b> s'en occupe
          </span>
        </p>
      )}
      {o.statut === 'fait' && o.fait_par && (
        <p className="mb-4 flex items-center gap-2 text-sm">
          <Tete uuid={uuidDe(joueurs, o.fait_par)} nom={o.fait_par} taille={22} />
          <span>
            Fait par <b className="text-primary">{o.fait_par}</b> {o.fait_le && ilYa(o.fait_le)}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {o.statut === 'a_faire' && (
          <Bouton variante="secondaire" onClick={() => agir('prendre')}>
            <Hand size={15} /> Je m'en occupe
          </Bouton>
        )}
        {o.statut !== 'fait' && (
          <Bouton onClick={(e) => agir('terminer', e.clientX, e.clientY)}>
            <Check size={15} strokeWidth={3} /> C'est fait !
          </Bouton>
        )}
        {o.statut === 'en_cours' && (o.pris_par === pseudo || !pseudo) && (
          <Bouton variante="fantome" onClick={() => agir('lacher')}>
            <Undo2 size={15} /> Lâcher
          </Bouton>
        )}
        {o.statut === 'fait' && (
          <Bouton variante="secondaire" onClick={() => agir('rouvrir')}>
            <RotateCcw size={15} /> Rouvrir
          </Bouton>
        )}
        <button
          onClick={() => (confirmer ? supprimer() : setConfirmer(true))}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition',
            confirmer ? 'bg-red-500/20 text-red-300' : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-300',
          )}
        >
          <Trash2 size={14} /> {confirmer ? 'Vraiment arracher ?' : 'Arracher'}
        </button>
      </div>
    </div>
  )
}


// ------------------------------------------------------------------

function FormPseudo({ initial, joueurs, valider }: { initial: string; joueurs: Joueur[]; valider: (p: string) => void }) {
  const [p, setP] = useState(initial)
  const ok = PSEUDO.test(p)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) valider(p)
      }}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Il sert juste à savoir qui fait quoi sur le tableau. Il reste enregistré dans ton navigateur.
      </p>
      <input
        autoFocus
        value={p}
        onChange={(e) => setP(e.target.value.trim())}
        placeholder="Steve"
        maxLength={16}
        className={champ}
      />
      {joueurs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {joueurs.slice(0, 12).map((j) => (
            <button
              type="button"
              key={j.uuid}
              onClick={() => setP(j.nom)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs transition',
                p === j.nom ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Tete uuid={j.uuid} nom={j.nom} taille={18} /> {j.nom}
            </button>
          ))}
        </div>
      )}
      <Bouton type="submit" disabled={!ok} className="mt-5 w-full">
        C'est moi
      </Bouton>
    </form>
  )
}

function FormCode({ valider }: { valider: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const soumettre = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur(await valider(code))
    setEnvoi(false)
  }
  return (
    <form onSubmit={soumettre}>
      <p className="mb-4 text-sm text-muted-foreground">
        Pour modifier le tableau, il faut le code donné par l'admin du serveur.
      </p>
      <div className="relative">
        <KeyRound size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={cn(champ, 'pl-10')}
          placeholder="••••••"
        />
      </div>
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
      <Bouton type="submit" disabled={!code || envoi} className="mt-5 w-full">
        Valider
      </Bouton>
    </form>
  )
}

const EXEMPLES = [
  'Finir le toit (cette fois pour de vrai)',
  'Arrêter de tomber dans la lave',
  'Une ferme à cochons qui marche',
  'Retrouver où est passée la base',
  'Un pont. Juste un pont. Svp.',
  'Battre le dragon sans mourir 12 fois',
  'Ranger les coffres (personne ne le fera)',
  'Construire un truc plus grand que la base de quelqu’un',
  'Trouver un village avec un forgeron',
  'Éclairer la mine avant que les creepers emménagent',
]

type Champs = { titre: string; description: string; categorie: string; pour: string | null }

function FormNouveau({ joueurs, valider }: { joueurs: Joueur[]; valider: (c: Champs) => Promise<void> }) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState('construction')
  const [pour, setPour] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [exemple] = useState(() => EXEMPLES[Math.floor(Math.random() * EXEMPLES.length)])

  const soumettre = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    await valider({ titre, description, categorie, pour: pour || null })
    setEnvoi(false)
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <input
        autoFocus
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        maxLength={80}
        placeholder={exemple}
        className={cn(champ, 'font-pixel')}
      />
      <p className="-mt-2 text-right text-xs text-muted-foreground tabular-nums">{titre.length}/80 · court et drôle, c'est mieux</p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Détails (facultatif)"
        className={cn(champ, 'resize-none')}
      />
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(CATEGORIES).map(([cle, c]) => {
          const Icone = c.icone
          const actif = categorie === cle
          return (
            <button
              type="button"
              key={cle}
              onClick={() => setCategorie(cle)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition',
                actif ? c.classe : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone size={16} />
              {c.nom}
            </button>
          )
        })}
      </div>
      <select value={pour} onChange={(e) => setPour(e.target.value)} className={champ}>
        <option value="">Pour tout le monde</option>
        {joueurs.map((j) => (
          <option key={j.uuid} value={j.nom}>
            Pour {j.nom}
          </option>
        ))}
      </select>
      <Bouton type="submit" disabled={!titre.trim() || envoi} className="w-full">
        <Plus size={16} strokeWidth={3} /> Ajouter
      </Bouton>
    </form>
  )
}
