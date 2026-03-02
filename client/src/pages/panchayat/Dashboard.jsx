import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, TrendingUp, Mic, AlertTriangle, ChevronRight,
  Users, FileText, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { apiClient, aiClient } from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getUserId } from '@/utils/userId'
import { useLanguage } from '@/context/LanguageContext'

const ACTION_KEYS = [
  { icon: Search, titleKey: 'ask_schemes', descKey: 'ask_schemes_desc', href: '/panchayat/schemes' },
  { icon: TrendingUp, titleKey: 'plan_budget', descKey: 'plan_budget_desc', href: '/panchayat/budget' },
  { icon: Mic, titleKey: 'record_meeting', descKey: 'record_meeting_desc', href: '/panchayat/meetings' },
  { icon: AlertTriangle, titleKey: 'view_grievances', descKey: 'view_grievances_desc', href: '/panchayat/grievances' },
]

export default function PanchayatDashboard() {
  const navigate = useNavigate()
  const { language, t, translateText } = useLanguage()
  const panchayatId = getUserId()

  const [stats, setStats] = useState({
    grievances: 0,
    pendingGrievances: 0,
    budgetUtilisation: 0,
    totalAllocated: 0,
    totalSpent: 0,
  })
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(false)

  // ── Fetch real stats from grievances & budget ──
  const fetchStats = async () => {
    setLoading(true)
    try {
      const [gRes, bRes] = await Promise.allSettled([
        apiClient.get(`/api/grievances/${panchayatId}`),
        apiClient.get(`/api/budget/${panchayatId}`),
      ])

      const grievances = gRes.status === 'fulfilled' ? (gRes.value.data.grievances || []) : []
      const budget = bRes.status === 'fulfilled' ? bRes.value.data : {}

      const pending = grievances.filter(g => g.status === 'New' || g.status === 'Assigned').length
      const allocations = budget.allocations || []
      const totalAllocated = allocations.reduce((s, a) => s + (a.allocated || 0), 0)
      const totalSpent = allocations.reduce((s, a) => s + (a.spent || 0), 0)
      const utilisation = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0

      setStats({
        grievances: grievances.length,
        pendingGrievances: pending,
        budgetUtilisation: utilisation,
        totalAllocated,
        totalSpent,
      })
    } catch {
      // keep defaults
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch integration alerts ──
  const fetchAlerts = async () => {
    setAlertsLoading(true)
    try {
      const res = await aiClient.post('/integration/detect-patterns', {
        panchayat_id: panchayatId,
        data_sources: ['grievances', 'schemes', 'budget'],
      }, { timeout: 60000 })
      const patterns = res.data.patterns || res.data.alerts || []
      const parsed = Array.isArray(patterns) ? patterns : [patterns]

      // Translate alert messages if not English
      if (language !== 'en' && parsed.length > 0) {
        try {
          const translated = await Promise.all(
            parsed.map(async (alert) => {
              const msg = typeof alert === 'string' ? alert : (alert.message || alert.description || '')
              const translatedMsg = await translateText(msg, { from: 'en' })
              if (typeof alert === 'string') return translatedMsg
              return { ...alert, message: alert.message ? translatedMsg : alert.message, description: alert.description ? translatedMsg : alert.description }
            })
          )
          setAlerts(translated)
        } catch {
          setAlerts(parsed)
        }
      } else {
        setAlerts(parsed)
      }
    } catch {
      // no alerts
    } finally {
      setAlertsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchAlerts()
  }, [panchayatId])

  const fmt = (n) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`

  const STAT_CARDS = [
    { label: t('grievances'), value: String(stats.grievances), subtext: `${stats.pendingGrievances} ${t('pending')}`, icon: AlertCircle },
    { label: t('budget_utilised'), value: `${stats.budgetUtilisation}%`, subtext: `${t('of')} ${fmt(stats.totalAllocated)}`, icon: TrendingUp },
    { label: t('total_spent'), value: fmt(stats.totalSpent), subtext: t('this_year'), icon: FileText },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panchayatgpt')}</p>
          <h1 className="text-2xl font-semibold">{t('governance_dashboard')}</h1>
          <p className="text-sm text-muted-foreground">{t('manage_panchayat')}</p>
        </div>
        <div className="flex items-center gap-3">

          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchAlerts() }}
            disabled={loading} className="gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Integration alerts */}
      {alertsLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={13} className="animate-spin" /> {t('checking_alerts')}
        </div>
      )}

      {alerts.map((alert, idx) => {
        const msg = typeof alert === 'string' ? alert : (alert.message || alert.description || JSON.stringify(alert))
        const severity = alert.severity || 'warning'
        return (
          <div key={idx}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <AlertTriangle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={severity === 'high' ? 'destructive' : 'warning'}>
                  {alert.type || t('integration_alert')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{msg}</p>
            </div>
          </div>
        )
      })}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTION_KEYS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.titleKey}
              onClick={() => navigate(action.href)}
              className="flex flex-col items-start gap-2.5 rounded-lg border border-border bg-card p-4 text-left hover:bg-secondary/60 transition-colors group"
            >
              <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <p className="text-sm font-medium leading-snug">{t(action.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t(action.descKey)}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {STAT_CARDS.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <Icon size={13} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.subtext}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
