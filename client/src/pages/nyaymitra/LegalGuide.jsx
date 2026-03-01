import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ChevronUp, Mic, Pencil, Shield,
  Mail, Truck, Clock, HelpCircle, AlertCircle, Scale, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useLanguage } from '@/context/LanguageContext'

const STEPS = [
  {
    n: 1,
    icon: Mic,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    titleKey: 'lg_step1_title',
    bodyKey: 'lg_step1_body',
    lawKey: 'lg_step1_law',
  },
  {
    n: 2,
    icon: Pencil,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    titleKey: 'lg_step2_title',
    bodyKey: 'lg_step2_body',
    lawKey: 'lg_step2_law',
  },
  {
    n: 3,
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    titleKey: 'lg_step3_title',
    bodyKey: 'lg_step3_body',
    lawKey: 'lg_step3_law',
  },
  {
    n: 4,
    icon: Mail,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    titleKey: 'lg_step4_title',
    bodyKey: 'lg_step4_body',
    lawKey: 'lg_step4_law',
  },
  {
    n: 5,
    icon: Truck,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    titleKey: 'lg_step5_title',
    bodyKey: 'lg_step5_body',
    lawKey: 'lg_step5_law',
  },
]

const FAQS = [
  { qKey: 'lg_q1', aKey: 'lg_a1' },
  { qKey: 'lg_q2', aKey: 'lg_a2' },
  { qKey: 'lg_q3', aKey: 'lg_a3' },
  { qKey: 'lg_q4', aKey: 'lg_a4' },
  { qKey: 'lg_q5', aKey: 'lg_a5' },
]

export default function LegalGuide() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [expandedStep, setExpandedStep] = useState(null)
  const [expandedFaq, setExpandedFaq] = useState(null)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/nyaymitra/file')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('lg_back')}
      </button>

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-primary" />
          <h1 className="text-xl font-semibold">{t('lg_title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('lg_subtitle')}</p>
      </div>

      {/* Intro card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">{t('lg_intro_title')}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('lg_intro')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step) => {
          const Icon = step.icon
          const isOpen = expandedStep === step.n
          return (
            <Card key={step.n} className={`border ${step.border}`}>
              <CardContent className="py-0">
                {/* Step header — always visible */}
                <button
                  className="w-full flex items-center gap-3 py-4 text-left"
                  onClick={() => setExpandedStep(isOpen ? null : step.n)}
                >
                  <div className={`w-9 h-9 rounded-full ${step.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={step.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="muted" className="text-xs px-1.5 py-0 shrink-0">Step {step.n}</Badge>
                      <p className="text-sm font-semibold truncate">{t(step.titleKey)}</p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={15} className="text-muted-foreground shrink-0" />
                    : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="pb-4 space-y-3 border-t border-border pt-3">
                    <p className="text-sm leading-relaxed">{t(step.bodyKey)}</p>
                    {/* Legal basis callout */}
                    <div className={`rounded-md ${step.bg} border ${step.border} px-3 py-2.5 flex items-start gap-2`}>
                      <Scale size={13} className={`${step.color} shrink-0 mt-0.5`} />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t(step.lawKey)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 15-day deadline */}
      <Card className="border-amber-500/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Clock size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">{t('lg_deadline_title')}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('lg_deadline_body')}</p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <HelpCircle size={15} className="text-primary" /> {t('lg_faq_title')}
        </h2>
        {FAQS.map((faq, idx) => {
          const isOpen = expandedFaq === idx
          return (
            <Card key={idx}>
              <CardContent className="py-0">
                <button
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                >
                  <p className="text-sm font-medium">{t(faq.qKey)}</p>
                  {isOpen
                    ? <ChevronUp size={14} className="text-muted-foreground shrink-0" />
                    : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="pb-3.5 border-t border-border pt-2.5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(faq.aKey)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Disclaimer */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive mb-1">{t('lg_disclaimer_title')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('lg_disclaimer')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
