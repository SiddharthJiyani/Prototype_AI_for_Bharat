import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

const NAV_KEYS = [
  { labelKey: 'nav_home', href: '/' },
  { labelKey: 'nav_nyaymitra', href: '/nyaymitra' },
  { labelKey: 'nav_panchayatgpt', href: '/panchayat' },
  { labelKey: 'nav_admin', href: '/admin', adminOnly: true },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const visibleLinks = NAV_KEYS.filter(
    (link) => !link.adminOnly || user?.role === 'admin'
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary">
              <span className="text-primary-foreground text-xs font-bold">IG</span>
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:block">
              IntegratedGov AI
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive(link.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <LanguageSelector />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{user?.name}</span>
                <button
                  onClick={() => { logout(); navigate('/') }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                  title={t('logout')}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {t('get_started')}
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(link.href)
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <div className="pt-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-muted-foreground">{user?.name}</span>
                <button
                  onClick={() => { logout(); navigate('/'); setMobileOpen(false) }}
                  className="text-sm text-destructive hover:underline"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { navigate('/login'); setMobileOpen(false) }}
                className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {t('get_started')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
