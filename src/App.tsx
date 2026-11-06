import { useEffect } from 'react'
import { Route, Routes, useLocation, Link } from 'react-router'
import { motion } from 'motion/react'
import { Home, Map, Trophy, Target, Skull, Gamepad2, Star } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { FondMonde, Bedrock } from '@/components/Monde'
import { Panneau } from '@/components/Panneau'
import { Creeper } from '@/components/Creeper'
import { FournisseurJeu, useJeu } from '@/lib/jeu'
import { site } from '@/config'
import Accueil from '@/pages/Accueil'
import Carte from '@/pages/Carte'
import Classements from '@/pages/Classements'
import Objectifs from '@/pages/Objectifs'
import Cimetiere from '@/pages/Cimetiere'
import MiniJeu from '@/pages/MiniJeu'
import StarDuJour from '@/pages/StarDuJour'

const liens: NavItem[] = [
  { name: 'Accueil', url: '/', icon: Home },
  { name: 'Carte', url: '/carte-du-monde', icon: Map },
  { name: 'Classements', url: '/classements', icon: Trophy },
  { name: 'Objectifs', url: '/objectifs', icon: Target },
  { name: 'Star du jour', url: '/star-du-jour', icon: Star },
  { name: 'Mini-jeu', url: '/mini-jeu', icon: Gamepad2 },
  { name: 'Cimetière', url: '/cimetiere', icon: Skull },
]

const titres: Record<string, string> = {
  '/carte-du-monde': 'Carte',
  '/classements': 'Classements',
  '/objectifs': 'Objectifs',
  '/cimetiere': 'Cimetière',
  '/mini-jeu': 'Mini-jeu',
  '/star-du-jour': 'Star du jour',
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
            <Route path="/cimetiere" element={<Cimetiere />} />
            <Route path="/mini-jeu" element={<MiniJeu />} />
            <Route path="/star-du-jour" element={<StarDuJour />} />
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
  const { debloquer } = useJeu()
  useEffect(() => debloquer('vide'), [])
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="ombre-mc font-pixel text-7xl text-primary">404</p>
        <p className="mt-3 text-muted-foreground">Ce chunk n'a pas encore été généré. Tu es tombé dans le vide.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          Retour au spawn
        </Link>
      </div>
    </main>
  )
}
