import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Trophy, Volume2, VolumeX } from 'lucide-react'
import { SUCCES, useJeu, type IdSucces } from '@/lib/jeu'
import { basculerSon, sonActif } from '@/lib/sons'
import { Bouton, Modale, Tete, champ } from '@/components/communs'
import { useApi, type Joueur } from '@/lib/api'
import { site } from '@/config'
import { cn } from '@/lib/utils'

// Texture de bruit 16×16 (comme une texture de bloc), agrandie en pixels nets
function texture(teintes: [number, number], taille = 16) {
  const c = document.createElement('canvas')
  c.width = c.height = taille
  const x = c.getContext('2d')!
  for (let i = 0; i < taille; i++)
    for (let j = 0; j < taille; j++) {
      const v = Math.round(teintes[0] + Math.random() * (teintes[1] - teintes[0]))
      x.fillStyle = `rgb(${v},${v},${v})`
      x.fillRect(i, j, 1, 1)
    }
  return c.toDataURL()
}

// ------------------------------------------------------------------
// Le fond : plus tu descends, plus tu creuses (terre → pierre → deepslate)
// ------------------------------------------------------------------
export function FondMonde() {
  const { scrollY } = useScroll()
  const couleur = useTransform(
    scrollY,
    [0, 700, 1500, 2400, 3400],
    ['#33221a', '#2c1f19', '#252831', '#1c1d2a', '#170f24'],
  )
  const tex = useMemo(() => texture([70, 190]), [])
  return (
    <motion.div aria-hidden className="fixed inset-0 -z-50" style={{ backgroundColor: couleur }}>
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: `url(${tex})`, backgroundSize: '128px', imageRendering: 'pixelated' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.45))]" />
    </motion.div>
  )
}

// ------------------------------------------------------------------
// Le pied de page : la bedrock, le compteur de succès et le son
// ------------------------------------------------------------------
// Pour apparaître au classement des succès, il faut dire qui on est
function ChoixPseudo() {
  const { pseudo, setPseudo } = useJeu()
  const { data: joueurs } = useApi<Joueur[]>('/api/joueurs')
  const [edition, setEdition] = useState(!pseudo)
  const [p, setP] = useState(pseudo)
  const connu = joueurs?.some((j) => j.nom.toLowerCase() === p.toLowerCase())

  if (!edition && pseudo) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
        <Tete uuid={joueurs?.find((j) => j.nom.toLowerCase() === pseudo.toLowerCase())?.uuid ?? pseudo} nom={pseudo} taille={28} />
        <span className="flex-1">
          Tes succès comptent pour <b className="text-primary">{pseudo}</b> au classement.
        </span>
        <button onClick={() => setEdition(true)} className="text-xs text-muted-foreground underline hover:text-foreground">
          changer
        </button>
      </div>
    )
  }
  return (
    <form
      className="mb-4 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!connu) return
        setPseudo(joueurs!.find((j) => j.nom.toLowerCase() === p.toLowerCase())!.nom)
        setEdition(false)
      }}
    >
      <p className="mb-2 text-sm text-muted-foreground">
        Ton pseudo Minecraft, pour que tes succès apparaissent dans les classements :
      </p>
      <div className="flex gap-2">
        <input value={p} onChange={(e) => setP(e.target.value.trim())} placeholder="Steve" maxLength={16} className={champ} />
        <Bouton type="submit" disabled={!connu}>
          OK
        </Bouton>
      </div>
      {p && joueurs && !connu && (
        <p className="mt-2 text-xs text-muted-foreground">Ce pseudo n'est jamais venu sur le serveur.</p>
      )}
    </form>
  )
}

export function Bedrock() {
  const { debloques, debloquer } = useJeu()
  const ref = useRef<HTMLDivElement>(null)
  const [liste, setListe] = useState(false)
  const [son, setSon] = useState(sonActif)
  const tex = useMemo(() => texture([15, 95]), [])
  const debloquerRef = useRef(debloquer)
  debloquerRef.current = debloquer

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && debloquerRef.current('fond'), { threshold: 0.9 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const total = Object.keys(SUCCES).length

  return (
    <footer className="relative mt-20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 pb-6 text-xs text-muted-foreground">
        <button
          onClick={() => setListe(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-pixel text-[#ffff55] transition hover:scale-105"
        >
          <Trophy size={14} /> {debloques.length}/{total} succès
        </button>
        <button
          onClick={() => setSon(basculerSon())}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition hover:text-foreground"
        >
          {son ? <Volume2 size={14} /> : <VolumeX size={14} />} Son {son ? 'activé' : 'coupé'}
        </button>
        <span className="w-full text-center sm:w-auto">{site.nom} · Pas affilié à Mojang ni Microsoft</span>
      </div>
      {/* Un peu de lave qui rougeoie au-dessus de la bedrock */}
      <div className="pointer-events-none h-16 bg-gradient-to-b from-transparent to-orange-600/20" />
      <div
        ref={ref}
        className="h-14 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_6px_0_rgba(0,0,0,0.4)]"
        style={{ backgroundImage: `url(${tex})`, backgroundSize: '56px', imageRendering: 'pixelated' }}
      />
      <div className="h-20 bg-[#0d0d0d] sm:hidden" />

      <Modale ouverte={liste} fermer={() => setListe(false)} titre={`Succès · ${debloques.length}/${total}`}>
        <ChoixPseudo />
        <ul className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
          {(Object.keys(SUCCES) as IdSucces[]).map((id) => {
            const s = SUCCES[id]
            const ok = debloques.includes(id)
            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                  ok ? 'border-[#ffff55]/30 bg-[#ffff55]/5' : 'border-border opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center',
                    ok ? 'bg-[#8b8b8b] text-[#1b1b1b] shadow-[inset_-3px_-3px_0_#555,inset_3px_3px_0_#c6c6c6]' : 'bg-muted',
                  )}
                >
                  {ok ? <s.icone size={18} strokeWidth={2.5} /> : <span className="font-pixel">?</span>}
                </span>
                <div>
                  <p className={cn('font-pixel text-sm', ok ? 'text-[#ffff55]' : 'text-muted-foreground')}>
                    {ok ? s.titre : '???'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ok || !('secret' in s) ? s.desc : 'Succès secret… cherche bien.'}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </Modale>
    </footer>
  )
}
