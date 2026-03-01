import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { AlertTriangle, Scale, Building2, Users, TrendingUp, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useLanguage } from '@/context/LanguageContext'

const CASE_DATA = [
  { month: 'Nov', cases: 12 },
  { month: 'Dec', cases: 19 },
  { month: 'Jan', cases: 28 },
  { month: 'Feb', cases: 34 },
]

const CASE_TYPES = [
  { type: 'MGNREGA Wage', count: 18 },
  { type: 'Land Dispute', count: 8 },
  { type: 'Consumer', count: 5 },
  { type: 'RTI', count: 3 },
]

const ALERTS = [
  { id: 1, panchayat: 'Rampur Gram Panchayat', message: '5 MGNREGA cases in 30 days — wages pending', severity: 'warning', time: '2h ago' },
  { id: 2, panchayat: 'Sitapur Panchayat', message: '3 land dispute cases flagged — boundary audit recommended', severity: 'warning', time: '1d ago' },
]

const STATS = [
  { label: 'Total Cases Filed', value: '93', change: '+12 this month', icon: Scale },
  { label: 'Panchayats Active', value: '24', change: '3 new this month', icon: Building2 },
  { label: 'Citizens Served', value: '1,240', change: '+340 this month', icon: Users },
  { label: 'Schemes Matched', value: '486', change: 'Across 24 villages', icon: FileText },
]

export default function Admin() {
  const { t } = useLanguage()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('admin')}</p>
        <h1 className="text-2xl font-semibold">{t('platform_dashboard')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin_subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <Icon size={13} className="text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.change}</p>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('cases_monthly')}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={CASE_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="cases" fill="hsl(var(--foreground))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('case_type_dist')}</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {CASE_TYPES.map((item) => {
              const max = Math.max(...CASE_TYPES.map(c => c.count))
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.type}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Integration alerts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('active_alerts')}</h2>
          <Badge variant="warning">{ALERTS.length} {t('alert')}</Badge>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
          {ALERTS.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 px-4 py-4">
              <AlertTriangle size={15} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium">{alert.panchayat}</p>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.message}</p>
              </div>
              <Badge variant="warning">{t('alert')}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
