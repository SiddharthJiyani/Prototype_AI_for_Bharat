import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogIn, User, Phone, Globe, ArrowRight, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
]

export default function Login() {
  const { login, quickLogin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('quick') // 'quick' or 'email'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState('hi')
  const [loading, setLoading] = useState(false)

  const handleQuickLogin = () => {
    if (!name.trim()) {
      toast.error('Please enter your name / अपना नाम दर्ज करें')
      return
    }
    quickLogin(name.trim(), language)
    toast.success(`Welcome, ${name}! / स्वागत है, ${name}!`)
    navigate('/nyaymitra')
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill all fields')
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      toast.success('Login successful!')
      navigate('/nyaymitra')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mx-auto">
            <span className="text-primary-foreground text-xl font-bold">IG</span>
          </div>
          <h1 className="text-2xl font-bold">IntegratedGov AI</h1>
          <p className="text-muted-foreground text-sm">
            Your AI-powered legal and governance assistant
          </p>
          <p className="text-muted-foreground text-xs">
            आपका AI-संचालित कानूनी और शासन सहायक
          </p>
        </div>

        {/* Language selector */}
        <div className="flex flex-wrap gap-2 justify-center">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                language === lang.code
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'quick'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚡ Quick Start / तुरंत शुरू
          </button>
          <button
            onClick={() => setMode('email')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'email'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            📧 Email Login
          </button>
        </div>

        {/* Form */}
        <div className="border border-border rounded-xl bg-card p-6 space-y-4">
          {mode === 'quick' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Your Name / आपका नाम <span className="text-destructive">*</span>
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
                  No password needed — just your name to get started
                </p>
              </div>

              <Button
                onClick={handleQuickLogin}
                className="w-full"
                size="lg"
              >
                Start Using / शुरू करें <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
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
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                <LogIn size={16} /> Log In
              </Button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          {mode === 'email' && (
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign Up
              </Link>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to IntegratedGov AI's Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
