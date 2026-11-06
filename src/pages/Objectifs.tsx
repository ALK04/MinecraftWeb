import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import {
  Check, Compass, Gem, Hammer, Hand, KeyRound, Pencil, Plus, RotateCcw, Sparkles, Sword, Trash2, Undo2, User, Wheat,
  type LucideIcon,
} from 'lucide-react'
import { Bouton, Chargement, EnTete, Modale, Tete, champ } from '@/components/communs'
import { api, ErreurApi, useApi, type EtatObjectif, type Joueur, type Objectif, type ReponseObjectifs } from '@/lib/api'
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

const COLONNES: { etat: EtatObjectif; nom: string; point: string }[] = [
  { etat: 'en_cours', nom: 'En cours', point: 'bg-sky-400' },
  { etat: 'a_faire', nom: 'À faire', point: 'bg-amber-300' },
  { etat: 'fait', nom: 'Fait', point: 'bg-primary' },
]

const PSEUDO = /^[A-Za-z0-9_]{1,16}$/
type Action = 'prendre' | 'lacher' | 'terminer' | 'rouvrir'

export default function Objectifs() {
  const { data, erreur, recharger } = useApi<ReponseObjectifs>('/api/objectifs', 20_000)
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')
  const { eclats, orbes, debloquer } = useJeu()

  // Pseudo et code, gardés dans le navigateur
  const [pseudo, setPseudoEtat] = useState(() => lireStockage('pseudo'))
  const codeRef = useRef(lireStockage('code-objectifs'))
  const setPseudo = (p: string) => {
    setPseudoEtat(p)
    ecrireStockage('pseudo', p)
  }

  const [fenetre, setFenetre] = useState<null | 'pseudo' | 'code' | 'nouveau'>(null)
  const enAttente = useRef<((p: string) => void) | null>(null)
  const [filtre, setFiltre] = useState<string>('tout')
  const [message, setMessage] = useState<string | null>(null)

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

  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 sm:pt-32">
      <EnTete surtitre="Ensemble, c'est mieux" titre="Objectifs">
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
            <Plus size={16} strokeWidth={3} /> Nouvel objectif
          </Bouton>
        </div>
      </EnTete>

      {/* Filtres */}
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
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
        <LayoutGroup>
          <div className="grid gap-5 lg:grid-cols-3">
            {COLONNES.map((col) => {
              const liste = objectifs.filter((o) => o.statut === col.etat)
              return (
                <section key={col.etat} className="rounded-3xl border border-border bg-card/50 p-3">
                  <h2 className="flex items-center gap-2 px-2 pt-1 pb-3 text-sm font-bold">
                    <span className={cn('size-2 rounded-full', col.point)} />
                    {col.nom}
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                      {liste.length}
                    </span>
                  </h2>
                  <div className="flex min-h-24 flex-col gap-2.5">
                    <AnimatePresence mode="popLayout">
                      {liste.map((o) => (
                        <CarteObjectif
                          key={o.id}
                          o={o}
                          pseudo={pseudo}
                          joueurs={joueurs}
                          agir={(a, x, y) => agir(o, a, x, y)}
                          supprimer={() => supprimer(o)}
                        />
                      ))}
                    </AnimatePresence>
                    {liste.length === 0 && (
                      <p className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border py-8 text-sm text-muted-foreground">
                        {col.etat === 'fait' ? 'Rien de terminé… pour l’instant' : 'Rien ici'}
                      </p>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </LayoutGroup>
      )}

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

      <Modale ouverte={fenetre === 'nouveau'} fermer={() => setFenetre(null)} titre="Nouvel objectif">
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
    </main>
  )
}

const uuidDe = (joueurs: Joueur[] | null, nom: string) =>
  joueurs?.find((j) => j.nom.toLowerCase() === nom.toLowerCase())?.uuid ?? nom

// ------------------------------------------------------------------

function CarteObjectif({
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
  const fait = o.statut === 'fait'

  return (
    <motion.article
      layout
      layoutId={`objectif-${o.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className={cn(
        'group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/25',
        fait && 'opacity-70',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', cat.classe)}>
          <Icone size={11} /> {cat.nom}
        </span>
        {o.pour && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            pour <b className="text-foreground">{o.pour}</b>
          </span>
        )}
      </div>

      <h3 className={cn('font-semibold leading-snug', fait && 'line-through decoration-primary/60')}>{o.titre}</h3>
      {o.description && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{o.description}</p>}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {o.statut === 'en_cours' && o.pris_par && (
          <>
            <Tete uuid={uuidDe(joueurs, o.pris_par)} nom={o.pris_par} taille={18} />
            <span>
              <b className="text-sky-300">{o.pris_par}</b> s'en occupe
            </span>
          </>
        )}
        {fait && o.fait_par && (
          <>
            <Tete uuid={uuidDe(joueurs, o.fait_par)} nom={o.fait_par} taille={18} />
            <span>
              Fait par <b className="text-primary">{o.fait_par}</b> {o.fait_le && ilYa(o.fait_le)}
            </span>
          </>
        )}
        {o.statut === 'a_faire' && (
          <span>
            Proposé par {o.cree_par} · {ilYa(o.cree_le)}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        {o.statut === 'a_faire' && (
          <PetitBouton onClick={() => agir('prendre')} icone={Hand} className="text-sky-300 hover:bg-sky-300/10">
            Je m'en occupe
          </PetitBouton>
        )}
        {o.statut !== 'fait' && (
          <PetitBouton onClick={(e) => agir('terminer', e.clientX, e.clientY)} icone={Check} className="text-primary hover:bg-primary/10">
            Terminé
          </PetitBouton>
        )}
        {o.statut === 'en_cours' && (o.pris_par === pseudo || !pseudo) && (
          <PetitBouton onClick={() => agir('lacher')} icone={Undo2}>
            Lâcher
          </PetitBouton>
        )}
        {fait && (
          <PetitBouton onClick={() => agir('rouvrir')} icone={RotateCcw}>
            Rouvrir
          </PetitBouton>
        )}
        <div className="ml-auto">
          <AnimatePresence mode="wait" initial={false}>
            {confirmer ? (
              <motion.button
                key="ok"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                onClick={supprimer}
                onBlur={() => setConfirmer(false)}
                autoFocus
                className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300"
              >
                Supprimer ?
              </motion.button>
            ) : (
              <motion.button
                key="poubelle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmer(true)}
                aria-label="Supprimer"
                className="rounded-full p-1.5 text-muted-foreground opacity-60 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}

function PetitBouton({
  icone: Icone,
  className,
  children,
  onClick,
}: {
  icone: LucideIcon
  className?: string
  children: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95',
        className,
      )}
    >
      <Icone size={13} /> {children}
    </button>
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

type Champs = { titre: string; description: string; categorie: string; pour: string | null }

function FormNouveau({ joueurs, valider }: { joueurs: Joueur[]; valider: (c: Champs) => Promise<void> }) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState('construction')
  const [pour, setPour] = useState('')
  const [envoi, setEnvoi] = useState(false)

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
        placeholder="Construire un portail de l'End"
        className={champ}
      />
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
