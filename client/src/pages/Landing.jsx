import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, Gavel, Building2, Scale, CheckCircle2, ArrowRight,
  FileText, Search, BookOpen, MapPin, Zap, Shield, Globe,
  Users, TrendingUp, AlertTriangle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useLanguage, LANGUAGES } from '@/context/LanguageContext'



const USER_TYPES = [
  { id: 'citizen', icon: Users, titleKey: 'citizen', descKey: 'citizen_desc', href: '/nyaymitra' },
  { id: 'panchayat', icon: Building2, titleKey: 'panchayat_member', descKey: 'panchayat_member_desc', href: '/panchayat' },
]

const NYAY_SERVICES = [
  { icon: CheckCircle2, titleKey: 'check_eligibility', descKey: 'check_eligibility_desc', href: '/nyaymitra' },
  { icon: FileText, titleKey: 'get_legal_help', descKey: 'get_legal_help_desc', href: '/nyaymitra/file' },
  { icon: BookOpen, titleKey: 'know_rights', descKey: 'know_rights_desc', href: '/nyaymitra' },
  { icon: Search, titleKey: 'track_case', descKey: 'track_case_desc', href: '/nyaymitra/cases' },
]

const PANCHAYAT_FEATURES = [
  { icon: Globe, titleKey: 'ai_scheme_navigator', descKey: 'ai_scheme_navigator_desc' },
  { icon: TrendingUp, titleKey: 'smart_budget', descKey: 'smart_budget_desc' },
  { icon: Mic, titleKey: 'auto_meeting_minutes', descKey: 'auto_meeting_minutes_desc' },
  { icon: AlertTriangle, titleKey: 'grievance_tracking_feat', descKey: 'grievance_tracking_feat_desc' },
]

const HOW_IT_WORKS = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
]

const PLATFORM_CAPS = [
  { icon: Mic, titleKey: 'multilingual_voice', descKey: 'multilingual_voice_desc' },
  { icon: FileText, titleKey: 'ai_text_doc', descKey: 'ai_text_doc_desc' },
  { icon: Shield, titleKey: 'gov_api_integration', descKey: 'gov_api_integration_desc' },
]

const INTEGRATION_KEYS = [
  'integration_point_1',
  'integration_point_2',
  'integration_point_3',
  'integration_point_4',
]

const MVP_DOES_KEYS = [
  'mvp_does_1', 'mvp_does_2', 'mvp_does_3', 'mvp_does_4', 'mvp_does_5', 'mvp_does_6',
]

const MVP_NOT_KEYS = [
  'mvp_not_1', 'mvp_not_2', 'mvp_not_3', 'mvp_not_4', 'mvp_not_5', 'mvp_not_6',
]

export default function Landing() {
  const [selectedType, setSelectedType] = useState(null)
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()

  const handleStart = () => {
    if (selectedType) {
      navigate(USER_TYPES.find(u => u.id === selectedType)?.href || '/login')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="flex flex-col">
      {/* ─── Hero / Onboarding ──────────────────────────── */}
      <section className="py-16 md:py-24 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {t('welcome_digital_gov')}
            </h1>
            <p className="text-muted-foreground text-base">
              {t('select_lang_role')}
            </p>
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('choose_language')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${language === lang.code
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-transparent'
                    }`}
                >
                  {lang.native}
                </button>
              ))}
            </div>
          </div>

          {/* User type */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('select_user_type')}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {USER_TYPES.map((type) => {
                const Icon = type.icon
                const active = selectedType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`rounded-lg border p-4 text-left transition-colors hover:bg-secondary/60 ${active
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
            {t('start_with_voice')}
          </Button>
        </div>
      </section>

      {/* ─── NyayMitra services ──────────────────────────── */}
      <section className="py-14 border-b border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('module_1')}
            </p>
            <h2 className="text-2xl font-semibold">{t('nyaymitra_citizen')}</h2>
            <p className="text-muted-foreground text-sm">{t('how_help_today')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NYAY_SERVICES.map((service) => {
              const Icon = service.icon
              return (
                <button
                  key={service.titleKey}
                  onClick={() => navigate(service.href)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-secondary/60 transition-colors group"
                >
                  <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div>
                    <p className="text-sm font-medium leading-snug">{t(service.titleKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {t(service.descKey)}
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
            <p className="text-xs text-muted-foreground">{t('tap_speak_request')}</p>
          </div>
        </div>
      </section>

      {/* ─── PanchayatGPT features ──────────────────────── */}
      <section className="py-14 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('module_2')}
            </p>
            <h2 className="text-2xl font-semibold">{t('panchayatgpt_governance')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('ai_tools_sarpanch')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {PANCHAYAT_FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.titleKey}
                  className="rounded-lg border border-border bg-card p-4 space-y-2"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  <p className="text-sm font-medium leading-snug">{t(feat.titleKey)}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t(feat.descKey)}</p>
                </div>
              )
            })}
          </div>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/panchayat')}>
              {t('open_panchayatgpt')}
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
                {t('integration_advantage')}
              </p>
              <h2 className="text-2xl font-semibold">
                {t('cross_module_intel')}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('cross_module_desc')}
              </p>
              <ul className="space-y-2">
                {INTEGRATION_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <Zap size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/60">
                <Scale size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">NyayMitra</p>
                  <p className="text-xs text-muted-foreground">{t('legal_aid_rights')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('governance_scheme')}</p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-md border border-border text-center">
                <p className="text-xs font-medium">{t('compound_impact')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('across_gov_justice')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────── */}
      <section className="py-14 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">{t('how_it_works')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('three_steps')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="space-y-3">
                <span className="text-3xl font-bold text-border">{step.step}</span>
                <h3 className="text-sm font-semibold">{t(step.titleKey)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Capabilities ───────────────────────── */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">{t('platform_capabilities')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('behind_scenes')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLATFORM_CAPS.map((cap) => {
              const Icon = cap.icon
              return (
                <div key={cap.titleKey} className="rounded-lg border border-border bg-card p-5 space-y-2">
                  <Icon size={18} className="text-muted-foreground" />
                  <p className="text-sm font-semibold">{t(cap.titleKey)}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(cap.descKey)}</p>
                </div>
              )
            })}
          </div>

          {/* MVP Scope */}
          <div className="rounded-lg border border-border bg-card p-6 mt-4">
            <div className="text-center mb-5">
              <h3 className="text-base font-semibold">{t('mvp_scope')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('mvp_scope_desc')}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('what_mvp_does')}</p>
                {MVP_DOES_KEYS.map((key) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{t(key)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('what_mvp_does_not')}</p>
                {MVP_NOT_KEYS.map((key) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <div className="w-3 h-3 mt-0.5 shrink-0 rounded-full border border-muted-foreground/40" />
                    <span className="text-muted-foreground">{t(key)}</span>
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
