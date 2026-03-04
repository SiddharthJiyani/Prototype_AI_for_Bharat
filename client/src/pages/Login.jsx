import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogIn, User, Phone, Globe, ArrowRight, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { useLanguage, LANGUAGES } from '@/context/LanguageContext'



export default function Login() {
  const { login, quickLogin, googleLogin } = useAuth()
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [mode, setMode] = useState('quick') // 'quick' or 'email'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuickLogin = () => {
    if (!name.trim()) {
      toast.error(t('enter_name'))
      return
    }
    quickLogin(name.trim(), language)
    toast.success(`Welcome, ${name}! / स्वागत है, ${name}!`)
    navigate('/nyaymitra')
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error(t('fill_required'))
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      toast.success(t('login_success'))
      navigate('/nyaymitra')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">

      {/* Fixed admin credentials hint — top-right corner */}
      <div className="fixed top-[72px] right-4 z-40 w-64 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/80 shadow-lg shadow-amber-100 dark:shadow-amber-950/50 backdrop-blur-sm p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none">🔑</span>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Admin Demo Access</span>
        </div>
        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-snug">
          Click below to auto-fill &amp; access the Admin dashboard:
        </p>
        <button
          onClick={() => {
            setMode('email')
            setEmail('admin@gmail.com')
            setPassword('admin')
          }}
          className="w-full text-left rounded-lg bg-white dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 px-2.5 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/70 transition-colors group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-amber-500 font-medium shrink-0">Email</span>
                <span className="font-mono font-bold text-amber-900 dark:text-amber-200 truncate">admin@gmail.com</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-amber-500 font-medium shrink-0">Pass</span>
                <span className="font-mono font-bold text-amber-900 dark:text-amber-200">admin</span>
              </div>
            </div>
            <span className="text-[10px] text-amber-500 dark:text-amber-400 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
              Fill →
            </span>
          </div>
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mx-auto">
            <span className="text-primary-foreground text-xl font-bold">IG</span>
          </div>
          <h1 className="text-2xl font-bold">{t('integratedgov_ai')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('ai_legal_governance')}
          </p>
        </div>

        {/* Language selector */}
        <div className="flex flex-wrap gap-2 justify-center">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${language === lang.code
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
            >
              {lang.native} ({lang.label})
            </button>
          ))}
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'quick'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('quick_start')}
          </button>
          <button
            onClick={() => setMode('email')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'email'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('email_login')}
          </button>
        </div>

        {/* Google Sign In */}
        <button
          onClick={googleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {t('continue_google')}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t('or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <div className="border border-border rounded-xl bg-card p-6 space-y-4">
          {mode === 'quick' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t('your_name')} <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickLogin()}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('no_password_needed')}
                </p>
              </div>

              <Button
                onClick={handleQuickLogin}
                className="w-full"
                size="lg"
              >
                {t('start_using')} <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                <LogIn size={16} /> {t('log_in')}
              </Button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          {mode === 'email' && (
            <p className="text-sm text-muted-foreground">
              {t('dont_have_account')}{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t('sign_up')}
              </Link>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('terms_notice')}
          </p>
        </div>
      </div>
    </div>
  )
}
