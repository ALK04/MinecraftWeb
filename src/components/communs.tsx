import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { tete } from '@/lib/api'
import { cn } from '@/lib/utils'

// Tête du skin d'un joueur
export function Tete({ uuid, nom, taille = 32, className }: { uuid: string; nom: string; taille?: number; className?: string }) {
  const [rate, setRate] = useState(false)
  if (rate) {
    return (
      <div
        style={{ width: taille, height: taille }}
        className={cn('grid place-items-center rounded-md bg-muted font-pixel text-muted-foreground', className)}
      >
        {nom.slice(0, 1).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={tete(uuid, Math.max(taille * 2, 32))}
      alt={nom}
      title={nom}
      width={taille}
      height={taille}
      loading="lazy"
      onError={() => setRate(true)}
      className={cn('pixel rounded-md', className)}
    />
  )
}

// Titre de page avec apparition en fondu + flou
export function EnTete({ surtitre, titre, children }: { surtitre: string; titre: ReactNode; children?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10 flex flex-wrap items-end justify-between gap-6"
    >
      <div>
        <p className="mb-2 font-pixel text-sm tracking-widest text-primary uppercase">{surtitre}</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{titre}</h1>
      </div>
      {children}
    </motion.header>
  )
}

// Fenêtre modale animée
export function Modale({
  ouverte,
  fermer,
  titre,
  children,
}: {
  ouverte: boolean
  fermer: () => void
  titre: string
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {ouverte && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && fermer()}
          onKeyDown={(e) => e.key === 'Escape' && fermer()}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label={titre}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/60"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{titre}</h2>
              <button
                onClick={fermer}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Bouton({
  variante = 'principal',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'secondaire' | 'fantome' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variante === 'principal' &&
          'bg-primary text-primary-foreground shadow-[0_0_24px_-6px] shadow-primary/60 hover:brightness-110',
        variante === 'secondaire' && 'border border-border bg-muted text-foreground hover:border-primary/40',
        variante === 'fantome' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    />
  )
}

export const champ =
  'w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10'

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
      <motion.span
        className="block size-4 bg-primary"
        animate={{ rotate: [0, 90, 180, 270, 360], borderRadius: ['2px', '50%', '2px', '50%', '2px'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {texte}
    </div>
  )
}
