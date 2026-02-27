import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, BookOpen, Scale, Mic, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import axios from 'axios'
import { getUserId } from '@/utils/userId'

const SERVICES = [
  {
    icon: Search,
    title: 'Check Scheme Eligibility',
    description: 'Find government schemes you qualify for based on your profile',
    href: '/nyaymitra',
    badge: null,
  },
  {
    icon: FileText,
    title: 'Get Legal Help',
    description: 'Generate legal notices and RTI applications in minutes',
    href: '/nyaymitra/file',
    badge: 'Voice',
  },
  {
    icon: BookOpen,
    title: 'Know My Rights',
    description: 'Understand your legal rights under labour, land, and welfare laws',
    href: '/nyaymitra',
    badge: null,
  },
  {
    icon: Scale,
    title: 'Track My Case',
    description: 'Check the status of your filed applications and court cases',
    href: '/nyaymitra/cases',
    badge: null,
  },
]

const statusVariant = (s) => {
  if (s === 'Filed') return 'secondary'
  if (s === 'In Progress') return 'warning'
  if (s === 'Resolved') return 'success'
  return 'muted'
}

export default function NyayDashboard() {
  const navigate = useNavigate()
  const [recentCases, setRecentCases] = useState([])
  const [casesLoading, setCasesLoading] = useState(true)

  useEffect(() => {
    const userId = getUserId()
    axios.get(`/api/cases/${userId}?userId=${userId}`)
      .then(res => {
        const sorted = (res.data.cases || [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
        setRecentCases(sorted)
      })
      .catch(() => setRecentCases([]))
      .finally(() => setCasesLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">NyayMitra</p>
        <h1 className="text-2xl font-semibold">Citizen Services</h1>
        <p className="text-sm text-muted-foreground">How can we help you today?</p>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SERVICES.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.title}
              onClick={() => navigate(s.href)}
              className="flex flex-col items-start gap-2.5 rounded-lg border border-border bg-card p-4 text-left hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex w-full items-center justify-between">
                <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                {s.badge && (
                  <Badge variant="secondary" className="text-[10px]">{s.badge}</Badge>
                )}
              </div>
              <div>
                <p className="text-sm font-medium leading-snug">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{s.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Voice CTA */}
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={() => navigate('/nyaymitra/file')}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
        >
          <Mic size={22} />
        </button>
        <p className="text-xs text-muted-foreground">Tap to speak your request</p>
      </div>

      {/* Recent Cases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Cases</h2>
          <button
            onClick={() => navigate('/nyaymitra/cases')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
        {casesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : recentCases.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground mb-3">No cases filed yet</p>
            <Button size="sm" onClick={() => navigate('/nyaymitra/file')}>File Your First Case</Button>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {recentCases.map((c) => (
              <button
                key={c.caseId}
                onClick={() => navigate(`/nyaymitra/cases/${encodeURIComponent(c.caseId)}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{c.type || 'Legal Case'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {c.caseId}
                  </p>
                </div>
                <Badge variant={statusVariant(c.status)}>{c.status || 'Filed'}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
