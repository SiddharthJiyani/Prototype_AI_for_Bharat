import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Filter } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const GRIEVANCES = [
  { id: 'AGR-2025-591', subject: 'Street light not working on Main Road', submittedBy: 'Rajesh Kumar', date: 'Jan 16, 2025', status: 'New', priority: 'High' },
  { id: 'AGR-2025-590', subject: 'Water supply irregular in Ward 3', submittedBy: 'Sunita Devi', date: 'Jan 15, 2025', status: 'Resolved', priority: 'Medium' },
  { id: 'PUK-2025-003', subject: 'Drainage blockage near Community Center', submittedBy: 'Amit Singh', date: 'Jan 12, 2025', status: 'Resolved', priority: 'High' },
  { id: 'AGR-2025-394', subject: 'Stray animal menace in residential areas', submittedBy: 'Priya Sharma', date: 'Jan 11, 2025', status: 'New', priority: 'Low' },
  { id: 'AGR-2025-395', subject: 'Road repair needed after monsoon', submittedBy: 'Mohan Lal', date: 'Jan 10, 2025', status: 'Resolved', priority: 'Medium' },
  { id: 'AGR-2025-396', subject: 'Public toilet maintenance required', submittedBy: 'Geeta Verma', date: 'Jan 9, 2025', status: 'Not Set', priority: 'Low' },
]

const TABS = ['All', 'New', 'Assigned', 'Resolved']

const statusVariant = (s) => {
  if (s === 'New') return 'warning'
  if (s === 'Resolved') return 'success'
  if (s === 'Assigned') return 'secondary'
  return 'muted'
}

const priorityVariant = (p) => {
  if (p === 'High') return 'destructive'
  if (p === 'Medium') return 'warning'
  return 'muted'
}

export default function Grievances() {
  const [tab, setTab] = useState('All')
  const navigate = useNavigate()

  const filtered = tab === 'All' ? GRIEVANCES : GRIEVANCES.filter(g => g.status === tab)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Grievance Tracking</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage citizen complaints</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus size={13} /> Add New Grievance
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({t === 'All' ? GRIEVANCES.length : GRIEVANCES.filter(g => g.status === t).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{g.id}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium truncate">{g.subject}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{g.submittedBy}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{g.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {g.status === 'Resolved' ? (
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Review
                      </button>
                    ) : (
                      <button className="text-xs font-medium hover:text-muted-foreground transition-colors">
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
