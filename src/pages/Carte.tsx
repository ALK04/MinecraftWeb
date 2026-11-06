import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ExternalLink } from 'lucide-react'
import { Chargement } from '@/components/communs'

// La carte BlueMap est servie sous /carte/ (Caddy en prod, proxy Vite en dev)
export default function Carte() {
  const [chargee, setChargee] = useState(false)

  return (
    <main className="px-3 pt-3 pb-24 sm:px-5 sm:pt-24 sm:pb-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-[calc(100dvh-7.5rem)] overflow-hidden rounded-3xl border border-border bg-card sm:h-[calc(100dvh-7.25rem)]"
      >
        <AnimatePresence>
          {!chargee && (
            <motion.div exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center">
              <Chargement texte="Chargement de la carte…" />
            </motion.div>
          )}
        </AnimatePresence>
        <iframe
          src="/carte/"
          title="Carte du monde"
          onLoad={() => setChargee(true)}
          className="h-full w-full"
        />
        <a
          href="/carte/"
          target="_blank"
          rel="noreferrer"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition hover:border-primary/50 hover:text-primary"
        >
          Plein écran <ExternalLink size={13} />
        </a>
      </motion.div>
    </main>
  )
}
