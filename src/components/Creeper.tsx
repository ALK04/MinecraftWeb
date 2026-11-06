import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLocation } from 'react-router'
import { COULEURS, useJeu } from '@/lib/jeu'
import { sons } from '@/lib/sons'

// Un creeper qui sort la tête dans le coin. Survole-le... si tu oses.

const VISAGE = [
  '........',
  '........',
  '.XX..XX.',
  '.XX..XX.',
  '...XX...',
  '..XXXX..',
  '..XXXX..',
  '..X..X..',
]
const VERTS = ['#5ec34a', '#4fae3e', '#6fd35a', '#3f9a33', '#82dc6c', '#57b844']
// Couleur de chaque pixel, choisie une fois pour toutes
const PEAU = Array.from({ length: 64 }, (_, i) => VERTS[(i * 7 + (i >> 3) * 3) % VERTS.length])

type Etat = 'cache' | 'regarde' | 'meche' | 'boum'

export function Creeper() {
  const { pathname } = useLocation()
  const { eclats, secouer, debloquer, compter } = useJeu()
  const [etat, setEtat] = useState<Etat>('cache')
  const ref = useRef<HTMLButtonElement>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)
  const meche = useRef<AudioBufferSourceNode | null>(null)

  // Il sort régulièrement la tête, puis se recache
  useEffect(() => {
    if (etat !== 'cache') return
    const t = setTimeout(() => setEtat('regarde'), 4000 + Math.random() * 9000)
    return () => clearTimeout(t)
  }, [etat])
  useEffect(() => {
    if (etat !== 'regarde') return
    const t = setTimeout(() => setEtat('cache'), 7000)
    return () => clearTimeout(t)
  }, [etat])

  const allumer = () => {
    if (etat !== 'regarde') return
    setEtat('meche')
    meche.current = sons.meche() ?? null
    minuterie.current = setTimeout(exploser, 1500)
  }

  const eteindre = () => {
    if (etat !== 'meche') return
    if (minuterie.current) clearTimeout(minuterie.current)
    meche.current?.stop()
    sons.ouf()
    debloquer('sangfroid')
    setEtat('regarde')
  }

  // Taper « creeper » au clavier le fait venir tout de suite
  useEffect(() => {
    const venir = () => setEtat((e) => (e === 'cache' ? 'regarde' : e))
    window.addEventListener('creeper-ici', venir)
    return () => window.removeEventListener('creeper-ici', venir)
  }, [])

  const exploser = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) {
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      eclats(cx, cy, COULEURS.creeper, 70, 14)
      eclats(cx, cy, ['#ff9d2e', '#ffd34a', '#ff5a1f', '#666'], 40, 10)
    }
    sons.boum()
    secouer(18)
    debloquer('creeper')
    compter('explosions', 5, 'kamikaze')
    setEtat('boum')
    setTimeout(() => setEtat('cache'), 900)
  }

  if (pathname === '/carte-du-monde') return null

  const visible = etat === 'regarde' || etat === 'meche'

  return (
    <div className="pointer-events-none fixed bottom-0 left-3 z-30 overflow-hidden pt-4 sm:left-8">
      <AnimatePresence>
        {visible && (
          <motion.button
            ref={ref}
            aria-label="Un creeper ! (ne le touche pas)"
            className="pointer-events-auto block"
            initial={{ y: 140 }}
            animate={{ y: 6, rotate: etat === 'meche' ? [0, -4, 4, -4, 0] : [0, -3, 0, 3, 0] }}
            exit={{ y: 140 }}
            transition={{
              y: { type: 'spring', stiffness: 160, damping: 14 },
              rotate: { duration: etat === 'meche' ? 0.25 : 3, repeat: Infinity },
            }}
            onPointerEnter={allumer}
            onPointerLeave={eteindre}
            onClick={allumer}
          >
            <motion.div
              animate={etat === 'meche' ? { scale: [1, 1.15, 1.05, 1.22, 1.1, 1.3] } : { scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeIn' }}
              className="relative"
            >
              {/* Tête, bien large */}
              <div className="grid h-[76px] w-24 grid-cols-8 grid-rows-8 shadow-[0_0_0_3px_rgba(0,0,0,0.25)] sm:h-[92px] sm:w-[120px]">
                {VISAGE.join('').split('').map((p, i) => (
                  <div key={i} style={{ background: p === 'X' ? (i < 32 ? '#111' : '#1d2b1a') : PEAU[i] }} />
                ))}
              </div>
              {/* Juste un bout de corps */}
              <div className="mx-auto grid h-4 w-16 grid-cols-8 sm:w-20">
                {PEAU.slice(8, 16).map((c, i) => (
                  <div key={i} style={{ background: c }} />
                ))}
              </div>
              {/* Clignotement blanc avant l'explosion */}
              {etat === 'meche' && (
                <motion.div
                  className="absolute inset-0 bg-white mix-blend-screen"
                  animate={{ opacity: [0, 0.8, 0, 0.8, 0, 0.9] }}
                  transition={{ duration: 1.5, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                />
              )}
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      {/* Flash de l'explosion */}
      <AnimatePresence>
        {etat === 'boum' && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[85] bg-white"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
