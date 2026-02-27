import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Gavel, Building2, Scale, CheckCircle2, ArrowRight,
  FileText, Search, BookOpen, MapPin, Zap, Shield, Globe,
  Users, TrendingUp, AlertTriangle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
]

const USER_TYPES = [
  {
    id: 'citizen',
    icon: Users,
    title: 'Citizen',
    description: 'Access legal help, schemes, and track cases',
    href: '/nyaymitra',
  },
  {
    id: 'panchayat',
    icon: Building2,
    title: 'Panchayat Member',
    description: 'Manage schemes, budgets, and grievances',
    href: '/panchayat',
  },
]

const NYAY_SERVICES = [
  {
    icon: CheckCircle2,
    title: 'Check Scheme Eligibility',
    description: 'Find government schemes you qualify for',
    href: '/nyaymitra',
  },
  {
    icon: FileText,
    title: 'Get Legal Help',
    description: 'Generate legal notices and RTI applications',
    href: '/nyaymitra/file',
  },
  {
    icon: BookOpen,
    title: 'Know My Rights',
    description: 'Understand your legal rights and protections',
    href: '/nyaymitra',
  },
  {
    icon: Search,
    title: 'Track My Case',
    description: 'Check status of your applications and cases',
    href: '/nyaymitra/cases',
  },
]

const PANCHAYAT_FEATURES = [
  {
    icon: Globe,
    title: 'AI Scheme Navigator',
    description: '200+ government schemes matched to your village profile via voice',
  },
  {
    icon: TrendingUp,
    title: 'Smart Budget Allocation',
    description: 'AI-assisted planning and fund allocation with BDO approval support',
  },
  {
    icon: Mic,
    title: 'Auto Meeting Minutes',
    description: 'Auto-generate Gram Sabha minutes from voice recordings',
  },
  {
    icon: AlertTriangle,
    title: 'Grievance Tracking',
    description: 'Track and manage citizen complaints with status transparency',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Speak in Your Language',
    description: 'Use Hindi, Marathi, Tamil, or any supported language — no literacy required.',
  },
  {
    step: '02',
    title: 'AI Understands & Acts',
    description: 'Amazon Bedrock processes your request, generates documents, or finds applicable schemes.',
  },
  {
    step: '03',
    title: 'Get Results Instantly',
    description: 'Receive legal notices, scheme lists, or governance reports — ready to act on.',
  },
]

const INTEGRATION_POINTS = [
  'Legal complaints → automatically alert Sarpanch of systemic issues',
  'Malnutrition data → triggers MGNREGA nutrition garden schemes',
  'Grievance patterns → inform Panchayat budget priorities',
  'Court case trends → shape proactive governance actions',
]

export default function Landing() {
  const [selectedLang, setSelectedLang] = useState('hi')
  const [selectedType, setSelectedType] = useState(null)
  const navigate = useNavigate()

  const handleStart = () => {
    if (selectedType) {
      navigate(USER_TYPES.find(t => t.id === selectedType)?.href || '/nyaymitra')
    } else {
      navigate('/nyaymitra')
    }
  }

  return (
    <div className="flex flex-col">
      {/* ─── Hero / Onboarding ──────────────────────────── */}
      <section className="py-16 md:py-24 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Welcome to Digital Governance
            </h1>
            <p className="text-muted-foreground text-base">
              Select your language and role to begin
            </p>
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Choose Your Language
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedLang === lang.code
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-transparent'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* User type */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Select User Type
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {USER_TYPES.map((type) => {
                const Icon = type.icon
                const active = selectedType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`rounded-lg border p-4 text-left transition-colors hover:bg-secondary/60 ${
                      active
                        ? 'border-foreground bg-secondary'
                        : 'border-border bg-card'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={active ? 'text-foreground' : 'text-muted-foreground'}
                    />
                    <p className="mt-2 text-sm font-medium">{type.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {type.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <Button size="lg" className="gap-2" onClick={handleStart}>
            <Mic size={16} />
            Start with Voice
          </Button>
        </div>
      </section>

      {/* ─── NyayMitra services ──────────────────────────── */}
      <section className="py-14 border-b border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Module 1
            </p>
            <h2 className="text-2xl font-semibold">NyayMitra — Citizen Services</h2>
            <p className="text-muted-foreground text-sm">How can we help you today?</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NYAY_SERVICES.map((service) => {
              const Icon = service.icon
              return (
                <button
                  key={service.title}
                  onClick={() => navigate(service.href)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-secondary/60 transition-colors group"
                >
                  <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div>
                    <p className="text-sm font-medium leading-snug">{service.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {service.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Voice input hint */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={() => navigate('/nyaymitra/file')}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Mic size={22} />
            </button>
            <p className="text-xs text-muted-foreground">Tap to speak your request</p>
          </div>
        </div>
      </section>

      {/* ─── PanchayatGPT features ──────────────────────── */}
      <section className="py-14 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Module 2
            </p>
            <h2 className="text-2xl font-semibold">PanchayatGPT — Governance AI</h2>
            <p className="text-muted-foreground text-sm">
              AI-powered tools for Sarpanch and Panchayat members
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {PANCHAYAT_FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="rounded-lg border border-border bg-card p-4 space-y-2"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  <p className="text-sm font-medium leading-snug">{feat.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{feat.description}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/panchayat')}>
              Open PanchayatGPT
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Integration Advantage ──────────────────────── */}
      <section className="py-14 border-b border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                The Integration Advantage
              </p>
              <h2 className="text-2xl font-semibold">
                Cross-Module Intelligence
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unlike standalone apps, IntegratedGov AI's shared infrastructure creates synergies — legal data informs governance, and governance data improves legal outcomes.
              </p>
              <ul className="space-y-2">
                {INTEGRATION_POINTS.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Zap size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/60">
                <Scale size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">NyayMitra</p>
                  <p className="text-xs text-muted-foreground">Legal aid + rights awareness</p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-px h-5 bg-border" />
                  <Zap size={14} className="text-muted-foreground" />
                  <div className="w-px h-5 bg-border" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/60">
                <Building2 size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">PanchayatGPT</p>
                  <p className="text-xs text-muted-foreground">Governance + scheme management</p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-md border border-border text-center">
                <p className="text-xs font-medium">= Compound Impact</p>
                <p className="text-xs text-muted-foreground mt-0.5">Across Governance & Justice</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────── */}
      <section className="py-14 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">How It Works</h2>
            <p className="text-muted-foreground text-sm">
              Three simple steps to access legal and governance services
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="space-y-3">
                <span className="text-3xl font-bold text-border">{step.step}</span>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Capabilities ───────────────────────── */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">Platform Capabilities</h2>
            <p className="text-muted-foreground text-sm">
              Behind-the-scenes technology powering the MVP
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Mic,
                title: 'Multilingual Voice Processing',
                description: 'Speech-to-text and text-to-speech in 5+ Indian languages via Amazon Transcribe & Polly',
              },
              {
                icon: FileText,
                title: 'AI Text & Document Generation',
                description: 'Context-aware legal and administrative document creation via Amazon Bedrock',
              },
              {
                icon: Shield,
                title: 'Government API Integration',
                description: 'Mock integration with scheme databases and eCourts — production-ready architecture',
              },
            ].map((cap) => {
              const Icon = cap.icon
              return (
                <div key={cap.title} className="rounded-lg border border-border bg-card p-5 space-y-2">
                  <Icon size={18} className="text-muted-foreground" />
                  <p className="text-sm font-semibold">{cap.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
                </div>
              )
            })}
          </div>

          {/* MVP Scope */}
          <div className="rounded-lg border border-border bg-card p-6 mt-4">
            <div className="text-center mb-5">
              <h3 className="text-base font-semibold">MVP Scope Summary</h3>
              <p className="text-xs text-muted-foreground mt-1">
                An MVP that enables citizens and Panchayat members to access legal help, schemes, and governance services through simple voice interactions, backed by AI-driven guidance and document generation.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What MVP Does</p>
                {[
                  'Voice-based interaction in multiple Indian languages',
                  'Legal document generation (notices, RTI applications)',
                  'Scheme eligibility checking and guidance',
                  'Panchayat decision support for schemes and budgets',
                  'Automated meeting minutes generation',
                  'Grievance tracking and status transparency',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What MVP Does Not</p>
                {[
                  'Full government submission and integration',
                  'Payment processing and financial transactions',
                  'Large-scale analytics and reporting dashboards',
                  'Real-time government database synchronisation',
                  'Advanced workflow automation',
                  'Multi-tier government hierarchy management',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs">
                    <div className="w-3 h-3 mt-0.5 shrink-0 rounded-full border border-muted-foreground/40" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
