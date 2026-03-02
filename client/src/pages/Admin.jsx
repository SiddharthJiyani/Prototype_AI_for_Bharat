import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import {
  AlertTriangle, Scale, Building2, Users, TrendingUp, FileText,
  RefreshCw, CheckCircle2, Loader2, BellRing,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useLanguage } from '@/context/LanguageContext'

const SERVER_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const SEVERITY_COLORS = {
  warning: 'text-amber-500',
  critical: 'text-red-500',
  info: 'text-blue-500',
}

export default function Admin() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${SERVER_BASE}/api/admin/stats`)
      setData(res.data)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Admin stats fetch failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)  // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading live data…</span>
      </div>
    )
  }

  const { stats = {}, monthly = [], caseTypes = [], alerts = [] } = data || {}

  const statCards = [
    { label: 'Total Cases Filed',   value: stats.totalCases ?? 0,       change: `${stats.resolvedCases ?? 0} resolved`,    icon: Scale },
    { label: 'Active Panchayats',   value: stats.activePanchayats ?? 0, change: 'Villages using platform',                  icon: Building2 },
    { label: 'Total Grievances',    value: stats.totalGrievances ?? 0,  change: `${stats.openAlerts ?? 0} active alerts`,   icon: Users },
    { label: 'Meetings Recorded',   value: stats.totalMeetings ?? 0,    change: 'MOMs stored in records',                   icon: FileText },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold">Platform Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live cross-module intelligence — real-time from database</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
          {lastRefresh && (
            <span className="opacity-60">
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <Icon size={13} className="text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{s.change}</p>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Trend (Cases &amp; Grievances)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12, borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="cases" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Cases" />
                  <Line type="monotone" dataKey="grievances" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Grievances" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Case Type Distribution</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {caseTypes.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No cases filed yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={caseTypes} layout="vertical" margin={{ top: 0, right: 0, left: 60, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12, borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 3, 3, 0]} name="Cases" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration alerts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active Integration Alerts</h2>
          {alerts.length > 0
            ? <Badge variant="warning"><BellRing size={11} className="mr-1" />{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</Badge>
            : <Badge variant="secondary"><CheckCircle2 size={11} className="mr-1" />All clear</Badge>
          }
        </div>
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
              No active alerts. Integration engine has not detected any unusual patterns.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 px-4 py-4">
                <AlertTriangle size={15} className={`${SEVERITY_COLORS[alert.severity] || 'text-muted-foreground'} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium">{alert.panchayat}</p>
                    {alert.count > 0 && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">{alert.count} cases</span>
                    )}
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <Badge variant="warning">Alert</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}