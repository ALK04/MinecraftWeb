import { useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

// Le ciel de l'accueil : coucher de soleil (ou nuit étoilée), nuages en blocs,
// soleil/lune cliquable, et une ligne de collines en blocs d'herbe tout en bas.

export function Ciel({ nuit, basculer }: { nuit: boolean; basculer: () => void }) {
  const etoiles = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 65,
        t: Math.random() < 0.15 ? 3 : 2,
        d: Math.random() * 4,
      })),
    [],
  )

  return (
    <>
      {/* Dégradés : on fond l'un dans l'autre */}
      <div className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,#24175a_0%,#5a3796_32%,#b0558f_58%,#f08a6c_78%,#ffc27a_92%)]" />
      <motion.div
        className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,#03040d_0%,#0b1033_40%,#1a2357_75%,#2c3a73_100%)]"
        initial={false}
        animate={{ opacity: nuit ? 1 : 0 }}
        transition={{ duration: 1.2 }}
      />

      {/* Étoiles */}
      <motion.div className="absolute inset-0 -z-20" initial={false} animate={{ opacity: nuit ? 1 : 0 }} transition={{ duration: 1.5 }}>
        {etoiles.map((e, i) => (
          <span
            key={i}
            className="absolute animate-pulse bg-white"
            style={{ left: `${e.x}%`, top: `${e.y}%`, width: e.t, height: e.t, animationDelay: `${e.d}s` }}
          />
        ))}
      </motion.div>

      {/* Nuages */}
      {[
        { top: '14%', w: 180, duree: 95, delai: -20, op: 0.8 },
        { top: '26%', w: 120, duree: 70, delai: -50, op: 0.6 },
        { top: '9%', w: 240, duree: 130, delai: -90, op: 0.5 },
        { top: '38%', w: 150, duree: 85, delai: -10, op: 0.45 },
      ].map((n, i) => (
        <div
          key={i}
          className="nuage absolute left-0 -z-20"
          style={{ top: n.top, animationDuration: `${n.duree}s`, animationDelay: `${n.delai}s`, opacity: nuit ? n.op * 0.25 : n.op }}
        >
          <div className="relative" style={{ width: n.w, height: n.w * 0.22 }}>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
            <div className="absolute top-0 left-[15%] h-full w-[45%] bg-white" />
            <div className="absolute top-[25%] left-[50%] h-[75%] w-[30%] bg-white" />
          </div>
        </div>
      ))}

      {/* Soleil / lune : clique pour changer l'heure */}
      <div className="absolute top-[16%] right-[8%] z-10 sm:right-[14%]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={nuit ? 'lune' : 'soleil'}
            onClick={basculer}
            aria-label={nuit ? 'Faire lever le soleil' : 'Faire tomber la nuit'}
            title="Clique-moi"
            initial={{ y: 160, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 160, opacity: 0, rotate: 45 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14 }}
            whileHover={{ scale: 1.12, rotate: 8 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'relative grid size-16 cursor-pointer grid-cols-4 sm:size-20',
              nuit ? 'shadow-[0_0_60px_10px_rgba(220,230,255,0.25)]' : 'shadow-[0_0_80px_24px_rgba(255,214,107,0.55)]',
            )}
          >
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                style={{
                  background: nuit
                    ? [1, 6, 11, 12].includes(i)
                      ? '#b9c0d4'
                      : '#eef1f8'
                    : [0, 3, 12, 15].includes(i)
                      ? '#ffd76b'
                      : '#fff1a8',
                }}
              />
            ))}
          </motion.button>
        </AnimatePresence>
      </div>
    </>
  )
}

// Collines en blocs d'herbe, avec quelques fleurs et un arbre
export function Collines() {
  const colonnes = useMemo(
    () =>
      Array.from({ length: 64 }, (_, i) => ({
        h: Math.max(1, Math.round(2 + Math.sin(i / 3.1) * 1.4 + Math.sin(i / 1.3) * 0.6)),
        fleur: i % 7 === 3 ? '#ff4d6d' : i % 11 === 5 ? '#ffd23f' : null,
        arbre: i === 9 || i === 41,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex items-end justify-center overflow-hidden">
      {colonnes.map((c, i) => (
        <motion.div
          key={i}
          className="flex w-7 shrink-0 flex-col sm:w-9"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3 + Math.abs(i - 32) * 0.02, type: 'spring', stiffness: 120, damping: 14 }}
        >
          {c.arbre && (
            <div className="relative">
              <div className="mx-auto -mb-px grid aspect-square w-[300%] -translate-x-1/3 grid-cols-3 bg-[#2f7d2a] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.15)]">
                <span className="bg-[#3a9433]" />
                <span />
                <span className="bg-[#276b23]" />
              </div>
              <div className="aspect-square w-full bg-[#6b4a28] shadow-[inset_3px_0_0_rgba(0,0,0,0.2)]" />
              <div className="aspect-square w-full bg-[#6b4a28] shadow-[inset_3px_0_0_rgba(0,0,0,0.2)]" />
            </div>
          )}
          {c.fleur && !c.arbre && (
            <div className="mx-auto mb-[-1px] flex flex-col items-center">
              <span className="size-1.5 sm:size-2" style={{ background: c.fleur }} />
              <span className="h-2 w-0.5 bg-[#3c8a2e]" />
            </div>
          )}
          <div className="aspect-square w-full bg-[#7a5233] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]">
            <div className="h-[30%] bg-[#5fbf3f] shadow-[inset_0_-2px_0_#4a9a30]" />
          </div>
          {Array.from({ length: c.h }, (_, k) => (
            <div
              key={k}
              className="aspect-square w-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: k < 1 ? '#7a5233' : '#5e3f27', filter: `brightness(${1 - k * 0.18})` }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}
