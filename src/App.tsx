import { useEffect } from 'react'
import { Route, Routes, useLocation, Link } from 'react-router'
import { motion } from 'motion/react'
import { Home, Map, Trophy, Target } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { FondMonde, Minerais, Bedrock } from '@/components/Monde'
import { Panneau } from '@/components/Panneau'
import { Creeper } from '@/components/Creeper'
import { FournisseurJeu } from '@/lib/jeu'
import { site } from '@/config'
import Accueil from '@/pages/Accueil'
import Carte from '@/pages/Carte'
import Classements from '@/pages/Classements'
import Objectifs from '@/pages/Objectifs'

const liens: NavItem[] = [
  { name: 'Accueil', url: '/', icon: Home },
  { name: 'Carte', url: '/carte-du-monde', icon: Map },
  { name: 'Classements', url: '/classements', icon: Trophy },
  { name: 'Objectifs', url: '/objectifs', icon: Target },
]

const titres: Record<string, string> = {
  '/carte-du-monde': 'Carte',
  '/classements': 'Classements',
  '/objectifs': 'Objectifs',
}

export function App() {
  const { pathname } = useLocation()
  const carte = pathname === '/carte-du-monde'

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = titres[pathname] ? `${titres[pathname]} · ${site.nom}` : site.nom
  }, [pathname])

  return (
    <FournisseurJeu>
      <FondMonde />
      <NavBar items={liens} />
      <div className="relative">
        {!carte && <Minerais key={pathname} debut={pathname === '/' ? 48 : 14} />}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/carte-du-monde" element={<Carte />} />
            <Route path="/classements" element={<Classements />} />
            <Route path="/objectifs" element={<Objectifs />} />
            <Route path="*" element={<Introuvable />} />
          </Routes>
        </motion.div>
        {!carte && <Bedrock />}
      </div>
      <Panneau />
      <Creeper />
    </FournisseurJeu>
  )
}

function Introuvable() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="ombre-mc font-pixel text-7xl text-primary">404</p>
        <p className="mt-3 text-muted-foreground">Ce chunk n'a pas encore été généré.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          Retour au spawn
        </Link>
      </div>
    </main>
  )
}
