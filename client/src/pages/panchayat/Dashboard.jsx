import { useNavigate } from 'react-router-dom'
import {
  Search, TrendingUp, Mic, AlertTriangle, ChevronRight,
  Users, FileText, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const ACTIONS = [
  {
    icon: Search,
    title: 'Ask About Schemes',
    description: 'Get instant information on government schemes',
    href: '/panchayat/schemes',
  },
  {
    icon: TrendingUp,
    title: 'Plan Budget',
    description: 'AI-assisted budget planning and allocation',
    href: '/panchayat/budget',
  },
  {
    icon: Mic,
    title: 'Record Meeting',
    description: 'Auto-generate meeting minutes from voice',
    href: '/panchayat/meetings',
  },
  {
    icon: AlertTriangle,
    title: 'View Grievances',
    description: 'Track and manage citizen complaints',
    href: '/panchayat/grievances',
  },
]

const STATS = [
  { label: 'Active Schemes', value: '12', subtext: 'Currently running', icon: FileText },
  { label: 'Pending Grievances', value: '8', subtext: 'Require attention', icon: AlertCircle },
  { label: 'Budget Utilised', value: '68%', subtext: 'Of allocated funds', icon: TrendingUp },
  { label: 'Citizens Served', value: '342', subtext: 'This month', icon: Users },
]

const ALERTS = [
  {
    id: 1,
    type: 'Integration Alert',
    message: '5 MGNREGA wage complaints detected this month from your Panchayat. Consider escalating to BDO for payment release.',
    severity: 'warning',
    time: '2 hours ago',
  },
]

export default function PanchayatDashboard() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PanchayatGPT</p>
          <h1 className="text-2xl font-semibold">Governance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your Panchayat operations efficiently</p>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <AlertTriangle size={14} className="text-muted-foreground" />
          </button>
          <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <Users size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Integration alert */}
      {ALERTS.map(alert => (
        <div
          key={alert.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
        >
          <AlertTriangle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="warning">{alert.type}</Badge>
              <span className="text-xs text-muted-foreground">{alert.time}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
          </div>
          <Button size="sm" variant="outline">Escalate</Button>
        </div>
      ))}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.title}
              onClick={() => navigate(action.href)}
              className="flex flex-col items-start gap-2.5 rounded-lg border border-border bg-card p-4 text-left hover:bg-secondary/60 transition-colors group"
            >
              <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <div>
                <p className="text-sm font-medium leading-snug">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((stat) => {
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
    </div>
  )
}
