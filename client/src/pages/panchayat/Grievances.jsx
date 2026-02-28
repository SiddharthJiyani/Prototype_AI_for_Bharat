import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Loader2, X, RefreshCw } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getUserId } from '@/utils/userId'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

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
  const navigate = useNavigate()
  const { language, translateText } = useLanguage()
  const panchayatId = getUserId()
  const [tab, setTab] = useState('All')
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New grievance form
  const [form, setForm] = useState({ subject: '', submittedBy: '', description: '', priority: 'Medium' })

  const fetchGrievances = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/grievances/${panchayatId}`)
      const raw = res.data.grievances || []

      // Translate subjects/descriptions if not English
      if (language !== 'en' && raw.length > 0) {
        try {
          const translated = await Promise.all(
            raw.map(async (g) => ({
              ...g,
              subject: await translateText(g.subject || '', { from: 'en' }),
              description: g.description ? await translateText(g.description, { from: 'en' }) : g.description,
            }))
          )
          setGrievances(translated)
        } catch {
          setGrievances(raw)
        }
      } else {
        setGrievances(raw)
      }
    } catch {
      // graceful — keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGrievances() }, [panchayatId, language])

  const createGrievance = async () => {
    if (!form.subject.trim() || !form.submittedBy.trim()) {
      toast.error('Subject and submitter are required')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/grievances', {
        panchayatId,
        ...form,
      })
      toast.success('Grievance created')
      setShowModal(false)
      setForm({ subject: '', submittedBy: '', description: '', priority: 'Medium' })
      fetchGrievances()
    } catch {
      toast.error('Failed to create grievance')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/grievances/${id}`, { status: newStatus })
      setGrievances(prev => prev.map(g => g.id === id ? { ...g, status: newStatus } : g))
      toast.success(`Grievance ${newStatus.toLowerCase()}`)
    } catch {
      toast.error('Failed to update')
    }
  }

  const filtered = tab === 'All' ? grievances : grievances.filter(g => g.status === tab)
  const countByStatus = (s) => s === 'All' ? grievances.length : grievances.filter(g => g.status === s).length

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
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSelector />
          <Button variant="outline" size="sm" onClick={fetchGrievances} disabled={loading} className="gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
            <Plus size={13} /> Add New Grievance
          </Button>
        </div>
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
            <span className="ml-1.5 text-xs text-muted-foreground">({countByStatus(t)})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No grievances{tab !== 'All' ? ` with status "${tab}"` : ''}. Click "Add New Grievance" to create one.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted By</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
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
                      {g.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{g.submittedBy}</td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant(g.priority)}>{g.priority || 'Medium'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {g.status === 'New' && (
                        <button onClick={() => updateStatus(g.id, 'Assigned')}
                          className="text-xs font-medium hover:text-muted-foreground transition-colors">
                          Assign
                        </button>
                      )}
                      {g.status === 'Assigned' && (
                        <button onClick={() => updateStatus(g.id, 'Resolved')}
                          className="text-xs font-medium hover:text-muted-foreground transition-colors">
                          Resolve
                        </button>
                      )}
                      {g.status === 'Resolved' && (
                        <span className="text-xs text-muted-foreground">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Grievance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">New Grievance</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-secondary"><X size={14} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Subject *</label>
                <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief description of the complaint"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Submitted By *</label>
                <input type="text" value={form.submittedBy} onChange={e => setForm(f => ({ ...f, submittedBy: e.target.value }))}
                  placeholder="Citizen name"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed description…"
                  rows={3}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button size="sm" onClick={createGrievance} disabled={submitting}>
                {submitting && <Loader2 size={13} className="animate-spin mr-1" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
