import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, ChevronRight, Filter, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { getUserId } from '@/utils/userId'

const statusVariant = (s) => {
  if (s === 'Filed') return 'secondary'
  if (s === 'In Progress') return 'warning'
  if (s === 'Resolved') return 'success'
  return 'muted'
}

export default function Cases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const userId = getUserId()

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/cases/${userId}?userId=${userId}`)
      setCases(response.data.cases || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch cases')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statusCounts = {
    Filed: cases.filter(c => c.status === 'Filed').length,
    'In Progress': cases.filter(c => c.status === 'In Progress').length,
    Resolved: cases.filter(c => c.status === 'Resolved').length,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/nyaymitra')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Services
      </button>

      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Your Cases</h1>
          <p className="text-sm text-muted-foreground">{cases.length} cases found</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchCases} disabled={loading}>
          <Filter size={13} /> {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Filed', count: statusCounts['Filed'], variant: 'secondary' },
          { label: 'In Progress', count: statusCounts['In Progress'], variant: 'warning' },
          { label: 'Resolved', count: statusCounts['Resolved'], variant: 'success' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3 text-center">
            <p className="text-xl font-bold">{s.count}</p>
            <Badge variant={s.variant} className="mt-1">{s.label}</Badge>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load cases</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 size={24} className="text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your cases...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && cases.length === 0 && !error && (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">No cases filed yet</p>
          <Button onClick={() => navigate('/nyaymitra/file')} className="gap-2">
            File Your First Case
          </Button>
        </div>
      )}

      {/* Cases list */}
      {!loading && cases.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
          {cases.map((c) => (
            <button
              key={c.caseId || c.id}
              onClick={() => navigate(`/nyaymitra/cases/${encodeURIComponent(c.caseId || c.id)}`)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.type || 'Legal Case'}</p>
                <p className="text-xs text-muted-foreground truncate">{c.description || c.transcript}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock size={10} /> {new Date(c.createdAt).toLocaleDateString('en-IN')} · {c.caseId || c.id}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <Badge variant={statusVariant(c.status)}>{c.status || 'Filed'}</Badge>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
