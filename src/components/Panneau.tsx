import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useVelocity, AnimatePresence } from 'motion/react'
import { useLocation } from 'react-router'
import { Check, Pencil, RotateCcw } from 'lucide-react'
import { useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'
import { site } from '@/config'
import { ecrireStockage, lireStockage } from '@/lib/utils'

// Un panneau en bois qu'on attrape, qu'on lance (il se balance), qu'on tape
// pour changer de message, et sur lequel on peut écrire (4 lignes, comme dans le jeu).

type Lignes = [string, string, string, string]

const MESSAGES: Record<string, Lignes[]> = {
  '/': [
    ['Bienvenue', 'dans le', site.nom, ''],
    ['Ce panneau', 'se déplace.', 'Si si.', 'Essaie !'],
    ['Ne creusez', 'JAMAIS', 'tout droit', 'vers le bas'],
    ['Attention :', 'chantier en', 'cours depuis', '3 ans'],
    ['Ici reposait', 'mon lit.', 'Merci le', 'creeper.'],
    ['Interdit de', 'voler les', 'carottes de', 'la ferme'],
    ['Lave à', '3 blocs.', 'Bon courage.', ''],
    ['Tape-moi', 'encore', 'une fois', 'pour voir'],
  ],
  '/classements': [
    ['Hall of', 'fame', '(et de la', 'honte)'],
    ['Le dernier', 'paie la', 'tournée de', 'pain'],
    ['Temps de jeu', '≠', 'temps bien', 'utilisé'],
  ],
  '/objectifs': [
    ['To-do list', 'du secteur', '', 'Au boulot !'],
    ['Un objectif', 'pas fini,', "c'est un", 'projet long'],
    ['Prends-en', 'un.', 'Juste un.', 'Allez.'],
  ],
  '/carte-du-monde': [
    ['Vous êtes', 'ici', '↓', ''],
    ['Pas de', 'spoil des', 'bases des', 'autres !'],
  ],
}

const vide: Lignes = ['', '', '', '']

export function Panneau() {
  const { pathname } = useLocation()
  const { debloquer } = useJeu()
  const messages = MESSAGES[pathname] ?? MESSAGES['/']
  const [index, setIndex] = useState(0)
  const [perso, setPerso] = useState<Lignes | null>(() => {
    const brut = lireStockage('panneau')
    return brut ? (JSON.parse(brut) as Lignes) : null
  })
  const [edition, setEdition] = useState(false)
  const [brouillon, setBrouillon] = useState<Lignes>(vide)
  const zone = useRef<HTMLDivElement>(null)

  useEffect(() => setIndex(0), [pathname])

  // Le balancement : la rotation suit la vitesse horizontale, avec un ressort mou
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const vx = useVelocity(x)
  const rotate = useSpring(useTransform(vx, [-2500, 0, 2500], [-35, 0, 35], { clamp: true }), {
    stiffness: 220,
    damping: 7,
  })

  const lignes = perso ?? messages[index % messages.length]

  const taper = () => {
    if (edition) return
    sons.bois()
    if (perso) return
    setIndex((i) => i + 1)
  }

  const commencer = () => {
    setBrouillon(perso ?? vide)
    setEdition(true)
  }

  const valider = () => {
    const blanc = brouillon.every((l) => !l.trim())
    setPerso(blanc ? null : brouillon)
    ecrireStockage('panneau', blanc ? '' : JSON.stringify(brouillon))
    setEdition(false)
    if (!blanc) debloquer('ecrivain')
  }

  return (
    <>
      <div ref={zone} className="pointer-events-none fixed inset-2 z-40" />
      <motion.div
        drag={!edition}
        dragConstraints={zone}
        dragElastic={0.15}
        dragTransition={{ power: 0.35, timeConstant: 260 }}
        onDragStart={() => {
          sons.bois()
          debloquer('panneau')
        }}
        onTap={taper}
        whileHover={{ scale: 1.04 }}
        whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.8 }}
        style={{ x, y, rotate, originY: 0.1 }}
        className="group fixed right-3 bottom-24 z-40 w-[168px] cursor-grab touch-none select-none sm:right-8 sm:bottom-8 sm:w-[216px]"
      >
        {/* La planche */}
        <div
          className="relative aspect-[2/1] border-[3px] border-[#5b3d1f] font-pixel text-[#2a1a08] shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
          style={{
            background:
              'repeating-linear-gradient(0deg, #b8915c 0 9px, #a98353 9px 11px, #be9862 11px 20px, #a37c4c 20px 22px)',
            boxShadow: 'inset 0 0 0 2px #d1ad75, inset 0 -4px 0 #8c6a3e, 0 14px 30px rgba(0,0,0,0.45)',
          }}
        >
          <div className="flex h-full flex-col items-center justify-center px-2 text-center text-[11px] leading-[1.45] sm:text-[13px]">
            {edition
              ? brouillon.map((l, i) => (
                  <input
                    key={i}
                    autoFocus={i === 0}
                    value={l}
                    maxLength={15}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const n = [...brouillon] as Lignes
                      n[i] = e.target.value
                      setBrouillon(n)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') valider()
                      if (e.key === 'Escape') setEdition(false)
                    }}
                    className="w-full bg-black/10 text-center outline-none focus:bg-black/20"
                  />
                ))
              : lignes.map((l, i) => (
                  <AnimatePresence key={i} mode="wait">
                    <motion.span
                      key={l + i + index}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12, delay: i * 0.04 }}
                      className="block min-h-[1.45em] w-full truncate"
                    >
                      {l}
                    </motion.span>
                  </AnimatePresence>
                ))}
          </div>

          {/* Boutons : écrire / valider / revenir aux messages */}
          <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            {edition ? (
              <BoutonRond onClick={valider} titre="Valider">
                <Check size={13} strokeWidth={3} />
              </BoutonRond>
            ) : (
              <>
                {perso && (
                  <BoutonRond
                    onClick={() => {
                      setPerso(null)
                      ecrireStockage('panneau', '')
                    }}
                    titre="Remettre les messages"
                  >
                    <RotateCcw size={12} strokeWidth={3} />
                  </BoutonRond>
                )}
                <BoutonRond onClick={commencer} titre="Écrire sur le panneau">
                  <Pencil size={12} strokeWidth={3} />
                </BoutonRond>
              </>
            )}
          </div>
        </div>
        {/* Le poteau */}
        <div
          className="mx-auto h-14 w-3.5 border-x-[3px] border-[#4a3118] sm:h-16 sm:w-4"
          style={{ background: 'linear-gradient(90deg, #7a5530, #8f6538 50%, #6b4a28)' }}
        />
      </motion.div>
    </>
  )
}

function BoutonRond({ onClick, titre, children }: { onClick: () => void; titre: string; children: ReactNode }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={titre}
      aria-label={titre}
      className="grid size-7 place-items-center rounded-full border-2 border-[#5b3d1f] bg-[#f3e2c0] text-[#3a2410] shadow-md transition hover:scale-110"
    >
      {children}
    </button>
  )
}
