// D'après « Tubelight Navbar » de ayushmxxn sur 21st.dev,
// adapté à React Router (l'onglet actif suit l'adresse de la page).
import { motion } from 'motion/react'
import { NavLink, useLocation } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const { pathname } = useLocation()
  const actif = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url))

  return (
    <div
      className={cn(
        'fixed bottom-0 left-1/2 z-50 mb-5 -translate-x-1/2 sm:top-0 sm:bottom-auto sm:mb-0 sm:pt-5',
        className,
      )}
    >
      <nav className="flex items-center gap-0.5 rounded-full border border-border bg-background/60 p-1 shadow-lg shadow-black/40 backdrop-blur-xl xl:gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = actif(item.url)

          return (
            <NavLink
              key={item.name}
              to={item.url}
              aria-label={item.name}
              className={cn(
                'relative cursor-pointer rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4 xl:px-5',
                'text-foreground/70 hover:text-primary',
                isActive && 'bg-muted text-primary',
              )}
            >
              <span className="hidden lg:inline">{item.name}</span>
              <span className="lg:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 -z-10 w-full rounded-full bg-primary/5"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary">
                    <div className="absolute -top-2 -left-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute top-0 left-2 h-4 w-4 rounded-full bg-primary/20 blur-sm" />
                  </div>
                </motion.div>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
