import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Clock, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      fetchCaseDetail()
    }
  }, [id])

  const fetchCaseDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/cases/${decodeURIComponent(id)}`)
      const data = response.data
      setCaseData(data)

      // Build timeline from case data
      const events = [
        {
          date: new Date(data.createdAt).toLocaleString('en-IN'),
          event: 'Case filed via IntegratedGov AI',
          done: true,
          type: 'filed',
        },
        {
          date: new Date(new Date(data.createdAt).getTime() + 60000).toLocaleString('en-IN'),
          event: 'Legal notice generated and sent',
          done: true,
          type: 'notice_sent',
        },
        {
          date: new Date(new Date(data.createdAt).getTime() + 86400000).toLocaleString('en-IN'),
          event: 'Awaiting acknowledgement',
          done: data.status === 'In Progress' || data.status === 'Resolved',
          type: 'waiting',
        },
        {
          date: new Date(new Date(data.createdAt).getTime() + 15 * 86400000).toLocaleString('en-IN'),
          event: 'Response deadline (15 days from notice)',
          done: data.status === 'Resolved',
          type: 'deadline',
        },
      ]
      setTimeline(events)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load case details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center gap-3 min-h-screen">
        <Loader2 size={24} className="text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading case details...</p>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <button
          onClick={() => navigate('/nyaymitra/cases')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Cases
        </button>
        <div className="flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Case not found</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/nyaymitra/cases')}>Back to Cases</Button>
      </div>
    )
  }

  const statusVariant = (s) => {
    if (s === 'Filed') return 'secondary'
    if (s === 'In Progress') return 'warning'
    if (s === 'Resolved') return 'success'
    return 'muted'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/nyaymitra/cases')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Cases
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">{caseData.type || 'Legal Case'}</h1>
          <p className="text-sm text-muted-foreground font-mono">{caseData.caseId}</p>
        </div>
        <Badge variant={statusVariant(caseData.status)}>{caseData.status || 'Filed'}</Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Case Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          {[
            { label: 'Filed On', value: new Date(caseData.createdAt).toLocaleDateString('en-IN') },
            { label: 'Case Type', value: caseData.type || 'Legal Dispute' },
            { label: 'Language', value: caseData.language === 'hi' ? 'हिंदी (Hindi)' : 'English' },
            { label: 'Case ID', value: caseData.caseId },
            { label: 'Status', value: caseData.status || 'Filed' },
            { label: 'Last Updated', value: new Date(caseData.updatedAt).toLocaleDateString('en-IN') },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Complaint text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Your Complaint</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-relaxed bg-secondary/30 px-3 py-2 rounded-md">
            {caseData.description || caseData.transcript}
          </p>
        </CardContent>
      </Card>

      {/* Generated notice */}
      {caseData.notice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legal Notice (Generated)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground overflow-auto max-h-48 bg-secondary/30 px-3 py-2 rounded-md">
              {caseData.notice}
            </pre>
            <Button variant="outline" className="gap-2 mt-3 w-full">
              <Download size={14} /> Download Notice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Case Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground shrink-0" />
                  )}
                  {idx < timeline.length - 1 && (
                    <div className={`w-0.5 h-6 ${item.done ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                  <p className={`text-sm ${item.done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {item.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => navigate('/nyaymitra/cases')} className="flex-1">
          Back to Cases
        </Button>
      </div>
    </div>
  )
}
