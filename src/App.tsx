import { useEffect } from 'react'
import { Route, Routes, useLocation, Link } from 'react-router'
import { Home, Map, Trophy, Target } from 'lucide-react'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
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

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = titres[pathname] ? `${titres[pathname]} · ${site.nom}` : site.nom
  }, [pathname])

  return (
    <>
      <NavBar items={liens} />
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/carte-du-monde" element={<Carte />} />
        <Route path="/classements" element={<Classements />} />
        <Route path="/objectifs" element={<Objectifs />} />
        <Route path="*" element={<Introuvable />} />
      </Routes>
      {pathname !== '/carte-du-monde' && (
        <footer className="mx-auto max-w-6xl px-4 pt-10 pb-28 text-center text-xs text-muted-foreground sm:pb-10">
          {site.nom} · Pas affilié à Mojang ni Microsoft
        </footer>
      )}
    </>
  )
}

function Introuvable() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="font-pixel text-7xl text-primary">404</p>
        <p className="mt-3 text-muted-foreground">Ce chunk n'a pas encore été généré.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  )
}
