import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import {
  AlertTriangle, Scale, Building2, Users, FileText,
  RefreshCw, CheckCircle2, Loader2, BellRing,
  Mail, X, Send, Eye, LayoutDashboard, FolderOpen,
  MessageSquare, Wallet, Clock, User, Shield,
  Search, Calendar, MapPin, ClipboardList, IndianRupee,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const SERVER_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const api = (path) => `${SERVER_BASE}${path}`

const SEVERITY_COLORS = {
  warning: 'text-amber-500',
  critical: 'text-red-500',
  info: 'text-blue-500',
}

const STATUS_VARIANT = {
  Filed: 'secondary',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'muted',
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'cases', label: 'Complaints', icon: FolderOpen },
  { id: 'grievances', label: 'Grievances', icon: MessageSquare },
  { id: 'meetings', label: 'Meetings', icon: Clock },
  { id: 'budget', label: 'Budget', icon: Wallet },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function relTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function fmtCurrency(n) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

// ─── Follow-up email modal ────────────────────────────────────────────────────
function FollowupModal({ caseItem, onClose, onSent }) {
  const [toEmail, setToEmail] = useState(caseItem.userEmail || caseItem.respondentEmail || '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!toEmail.trim() || !message.trim()) {
      toast.error('Enter recipient email and message')
      return
    }
    setSending(true)
    try {
      await axios.post(api(`/api/admin/cases/${caseItem.caseId}/followup`), {
        toEmail: toEmail.trim(),
        message: message.trim(),
        adminName: 'Admin',
      })
      toast.success('Follow-up email sent!')
      onSent()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Send Follow-up Email</h3>
              <p className="text-xs text-muted-foreground">Case {caseItem.caseId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs space-y-1">
          <p><span className="text-muted-foreground">Type:</span> <span className="font-medium">{caseItem.type}</span></p>
          <p><span className="text-muted-foreground">Complainant:</span> <span className="font-medium">{caseItem.userName || 'Unknown'}</span></p>
          <p className="text-muted-foreground truncate">{caseItem.gist}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="citizen@example.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="We have reviewed your complaint and wish to inform you that..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={send} disabled={sending} className="gap-1.5">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? 'Sending…' : 'Send Email'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Case Detail side panel ───────────────────────────────────────────────────
function CaseDetail({ caseId, onClose, onFollowup }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(api(`/api/admin/cases/${caseId}`))
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Failed to load case'))
      .finally(() => setLoading(false))
  }, [caseId])

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Complaint Detail</p>
            <h2 className="text-base font-semibold">{caseId}</h2>
          </div>
          <div className="flex items-center gap-2">
            {detail && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onFollowup(detail)}>
                <Mail size={13} /> Follow-up
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Case not found
          </div>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            {/* Status + badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={STATUS_VARIANT[detail.status] || 'secondary'}>{detail.status}</Badge>
              <Badge variant="secondary">{detail.type}</Badge>
              {detail.isSigned && <Badge variant="success"><Shield size={10} className="mr-1" />eSigned</Badge>}
              {detail.language && <Badge variant="muted">{detail.language.toUpperCase()}</Badge>}
            </div>

            {/* Citizen info */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User size={12} /> Complainant
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{detail.user?.name || '—'}</span>
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium break-all">{detail.user?.email || '—'}</span>
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{detail.user?.phone || '—'}</span>
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">{detail.userId || '—'}</span>
              </div>
            </div>

            {/* Key metadata */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case Info</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Panchayat / Area</span>
                <span className="font-medium">{detail.panchayatId || '—'}</span>
                <span className="text-muted-foreground">Law Cited</span>
                <span className="font-medium">{detail.lawCited || '—'}</span>
                <span className="text-muted-foreground">Filed At</span>
                <span className="font-medium">{fmtTime(detail.createdAt)}</span>
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{fmtTime(detail.updatedAt)}</span>
                {detail.dispatchedAt && <>
                  <span className="text-muted-foreground">Notice Dispatched</span>
                  <span className="font-medium">{fmtTime(detail.dispatchedAt)}</span>
                </>}
                {detail.respondentEmail && <>
                  <span className="text-muted-foreground">Sent To</span>
                  <span className="font-medium break-all">{detail.respondentEmail}</span>
                </>}
                {detail.maskedAadhaar && <>
                  <span className="text-muted-foreground">Aadhaar</span>
                  <span className="font-mono text-xs">{detail.maskedAadhaar}</span>
                </>}
              </div>
            </div>

            {/* Complaint text */}
            {(detail.description || detail.transcript) && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Complaint Description</p>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {detail.description || detail.transcript}
                </p>
              </div>
            )}

            {/* Legal notice */}
            {detail.notice && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generated Legal Notice</p>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground max-h-48 overflow-y-auto">
                  {typeof detail.notice === 'string' ? detail.notice : JSON.stringify(detail.notice, null, 2)}
                </pre>
              </div>
            )}

            {/* Timeline */}
            {detail.timeline?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
                <div className="space-y-2">
                  {detail.timeline.map((ev, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.eventType === 'admin_followup' ? 'bg-primary' : 'bg-muted-foreground'
                          }`} />
                        {i < detail.timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm">{ev.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(ev.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Meeting Detail side panel ───────────────────────────────────────────────────
function MeetingDetail({ meeting, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // PK is like "PANCHAYAT#default", extract panchayatId
    const panchayatId = (meeting.PK || '').replace('PANCHAYAT#', '') || meeting.panchayatId || 'default'
    const skEncoded = encodeURIComponent(meeting.SK)
    axios.get(api(`/api/admin/meetings/${panchayatId}/${skEncoded}`))
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Failed to load meeting details'))
      .finally(() => setLoading(false))
  }, [meeting])

  const m = detail
  const mins = m?.minutes || {}

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Meeting Minutes</p>
            <h2 className="text-base font-semibold">{meeting.meetingType || 'Gram Sabha'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{meeting.panchayatId} · {fmtDate(meeting.meetingDate)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : !m ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Meeting not found</div>
        ) : (
          <div className="flex-1 p-5 space-y-5">

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Calendar, label: 'Date', value: m.meetingDate },
                { icon: MapPin, label: 'Location', value: m.location || '—' },
                { icon: Users, label: 'Attendees', value: m.attendees || '—' },
                { icon: ClipboardList, label: 'Type', value: m.meetingType || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 rounded-lg border border-border p-3">
                  <Icon size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Agenda */}
            {mins.agenda_items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agenda Items</p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {mins.agenda_items.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start gap-2.5 text-sm">
                      <span className="text-xs text-muted-foreground shrink-0 w-4 pt-0.5">{i + 1}.</span>
                      <span>{typeof item === 'string' ? item : item.item || item.topic || JSON.stringify(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Decisions */}
            {mins.key_decisions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Decisions</p>
                <div className="space-y-2">
                  {mins.key_decisions.map((d, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm rounded-lg bg-secondary/40 px-3 py-2.5">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-foreground" />
                      <span className="text-muted-foreground">{typeof d === 'string' ? d : d.decision || d.item || JSON.stringify(d)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {mins.action_items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Items</p>
                <div className="space-y-2">
                  {mins.action_items.map((a, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                      <p className="text-sm font-medium">{typeof a === 'string' ? a : a.task}</p>
                      {a.assigned && <p className="text-xs text-muted-foreground">Assigned to: {a.assigned}</p>}
                      {a.deadline && <p className="text-xs text-muted-foreground">Deadline: {a.deadline}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schemes discussed */}
            {mins.schemes_discussed?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schemes Discussed</p>
                <div className="flex flex-wrap gap-2">
                  {mins.schemes_discussed.map((s, i) => (
                    <Badge key={i} variant="secondary">
                      {typeof s === 'string' ? s : s.name || s.scheme || JSON.stringify(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Funds approved */}
            {mins.funds_approved && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funds Approved</p>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <IndianRupee size={15} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {Array.isArray(mins.funds_approved)
                      ? mins.funds_approved.map((f, i) => (
                        <p key={i}>{typeof f === 'string' ? f : [f.amount_inr, f.purpose, f.source].filter(Boolean).join(' — ')}</p>
                      ))
                      : <p>{typeof mins.funds_approved === 'string' ? mins.funds_approved : [mins.funds_approved?.amount_inr, mins.funds_approved?.purpose, mins.funds_approved?.source].filter(Boolean).join(' — ')}</p>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Next meeting */}
            {mins.next_meeting && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Meeting</p>
                  <p className="text-sm font-medium">{mins.next_meeting}</p>
                </div>
              </div>
            )}

            {/* Hindi summary */}
            {mins.summary_hindi && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm leading-relaxed">{mins.summary_hindi}</p>
                </div>
              </div>
            )}

            {/* Original transcript */}
            {m.transcript && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original Transcript</p>
                <div className="rounded-lg border border-border p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{m.transcript}</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [statsData, setStatsData] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Cases tab state
  const [cases, setCases] = useState([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')
  const [caseFilter, setCaseFilter] = useState('All')
  const [selectedCase, setSelectedCase] = useState(null)   // for side panel
  const [followupCase, setFollowupCase] = useState(null)   // for email modal

  // Panchayat tabs state
  const [grievances, setGrievances] = useState([])
  const [grievancesLoading, setGrievancesLoading] = useState(false)
  const [meetings, setMeetings] = useState([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null) // for meeting detail panel
  const [budgets, setBudgets] = useState([])
  const [budgetsLoading, setBudgetsLoading] = useState(false)

  const [lastRefresh, setLastRefresh] = useState(null)

  // ── Loaders ──
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const r = await axios.get(api('/api/admin/stats'))
      setStatsData(r.data)
      setLastRefresh(new Date())
    } catch { /* silent */ }
    finally { setStatsLoading(false) }
  }, [])

  const loadCases = useCallback(async () => {
    setCasesLoading(true)
    try {
      const r = await axios.get(api('/api/admin/cases'))
      setCases(r.data.cases || [])
    } catch { toast.error('Failed to load cases') }
    finally { setCasesLoading(false) }
  }, [])

  const loadGrievances = useCallback(async () => {
    setGrievancesLoading(true)
    try {
      const r = await axios.get(api('/api/admin/grievances'))
      setGrievances(r.data.grievances || [])
    } catch { /* silent */ }
    finally { setGrievancesLoading(false) }
  }, [])

  const loadMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    try {
      const r = await axios.get(api('/api/admin/meetings'))
      setMeetings(r.data.meetings || [])
    } catch { /* silent */ }
    finally { setMeetingsLoading(false) }
  }, [])

  const loadBudgets = useCallback(async () => {
    setBudgetsLoading(true)
    try {
      const r = await axios.get(api('/api/admin/budget'))
      setBudgets(r.data.budgets || [])
    } catch { /* silent */ }
    finally { setBudgetsLoading(false) }
  }, [])

  // Load data per tab
  useEffect(() => {
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'cases') loadCases()
    if (activeTab === 'grievances') loadGrievances()
    if (activeTab === 'meetings') loadMeetings()
    if (activeTab === 'budget') loadBudgets()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered cases
  const STATUS_FILTERS = ['All', 'Filed', 'In Progress', 'Resolved']
  const filteredCases = cases.filter(c => {
    const statusOk = caseFilter === 'All' || c.status === caseFilter
    const q = caseSearch.toLowerCase()
    const searchOk = !q || [c.caseId, c.type, c.userName, c.userEmail, c.gist, c.panchayatId]
      .some(v => (v || '').toLowerCase().includes(q))
    return statusOk && searchOk
  })

  // ── Refresh handler per tab ──
  const handleRefresh = () => {
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'cases') loadCases()
    if (activeTab === 'grievances') loadGrievances()
    if (activeTab === 'meetings') loadMeetings()
    if (activeTab === 'budget') loadBudgets()
  }

  const { stats = {}, monthly = [], caseTypes = [], alerts = [] } = statsData || {}

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
            <h1 className="text-2xl font-semibold mt-0.5">Platform Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live cross-module intelligence — real-time from database
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
          >
            <RefreshCw size={12} />
            Refresh
            {lastRefresh && <span className="opacity-60">{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          statsLoading ? (
            <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Loading live data…
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Cases Filed', value: stats.totalCases ?? 0, sub: `${stats.resolvedCases ?? 0} resolved`, icon: Scale },
                  { label: 'Active Panchayats', value: stats.activePanchayats ?? 0, sub: 'Villages on platform', icon: Building2 },
                  { label: 'Total Grievances', value: stats.totalGrievances ?? 0, sub: `${stats.openAlerts ?? 0} active alerts`, icon: Users },
                  { label: 'Meetings Recorded', value: stats.totalMeetings ?? 0, sub: 'MOMs stored in records', icon: FileText },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <Icon size={13} className="text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  )
                })}
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Monthly Trend (Cases &amp; Grievances)</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {monthly.length === 0
                      ? <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No data yet</div>
                      : (
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="cases" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Cases" />
                            <Line type="monotone" dataKey="grievances" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Grievances" />
                          </LineChart>
                        </ResponsiveContainer>
                      )
                    }
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Case Type Distribution</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {caseTypes.length === 0
                      ? <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No cases filed yet</div>
                      : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={caseTypes} layout="vertical" margin={{ top: 0, right: 0, left: 60, bottom: 0 }}>
                            <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                            <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 3, 3, 0]} name="Cases" />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    }
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
                {alerts.length === 0
                  ? (
                    <Card>
                      <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                        No active alerts.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 px-4 py-4">
                          <AlertTriangle size={15} className={`${SEVERITY_COLORS[alert.severity] || 'text-muted-foreground'} mt-0.5 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-medium">{alert.panchayat}</p>
                              {alert.count > 0 && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">{alert.count} cases</span>}
                              <span className="text-xs text-muted-foreground">{alert.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                          </div>
                          <Badge variant="warning">Alert</Badge>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          )
        )}

        {/* ── COMPLAINTS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  placeholder="Search by case ID, type, complainant, description…"
                  className="w-full pl-8 pr-4 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-1">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setCaseFilter(f)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${caseFilter === f
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {casesLoading ? 'Loading…' : `${filteredCases.length} complaint${filteredCases.length !== 1 ? 's' : ''}`}
            </div>

            {casesLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" /> Loading complaints…
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No complaints found{caseSearch ? ` for "${caseSearch}"` : ''}.
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        {['Case ID', 'Type', 'Complainant', 'Gist', 'Area', 'Status', 'Filed', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCases.map(c => (
                        <tr key={c.caseId} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{c.caseId}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className="text-xs">{c.type}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs whitespace-nowrap">{c.userName || <span className="text-muted-foreground italic">Unknown</span>}</p>
                            {c.userEmail && <p className="text-xs text-muted-foreground truncate max-w-[120px]">{c.userEmail}</p>}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{c.gist || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.panchayatId}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={STATUS_VARIANT[c.status] || 'secondary'}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedCase(c.caseId)}
                                title="View full details"
                                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => setFollowupCase(c)}
                                title="Send follow-up email"
                                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <Mail size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GRIEVANCES TAB ────────────────────────────────────────────────── */}
        {activeTab === 'grievances' && (
          grievancesLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Loading grievances…
            </div>
          ) : grievances.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">No grievances found.</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{grievances.length} grievance{grievances.length !== 1 ? 's' : ''} across all panchayats</p>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        {['ID', 'Panchayat', 'Subject', 'Submitted By', 'Priority', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grievances.map(g => (
                        <tr key={g.id || g.PK} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{g.id}</td>
                          <td className="px-4 py-3 text-xs">{g.panchayatId || '—'}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-sm font-medium truncate">{g.subject}</p>
                            {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs">{g.submittedBy || '—'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={g.priority === 'High' ? 'destructive' : g.priority === 'Medium' ? 'warning' : 'muted'}>
                              {g.priority || 'Medium'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={g.status === 'Resolved' ? 'success' : g.status === 'Assigned' ? 'secondary' : 'warning'}>
                              {g.status || 'New'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(g.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── MEETINGS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'meetings' && (
          meetingsLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Loading meetings…
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">No meetings recorded yet.</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded · click any card to view full minutes</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {meetings.map(m => (
                  <button
                    key={m.meetingId || m.SK}
                    onClick={() => setSelectedMeeting(m)}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 text-left hover:bg-secondary/40 hover:border-foreground/20 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{m.meetingType || 'Gram Sabha'}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.panchayatId || 'Unknown Panchayat'}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{fmtDate(m.meetingDate)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span className="text-muted-foreground">Location</span>
                      <span className="truncate">{m.location || '—'}</span>
                      <span className="text-muted-foreground">Attendees</span>
                      <span>{m.attendees || '—'}</span>
                      <span className="text-muted-foreground">Recorded</span>
                      <span>{relTime(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                      <Eye size={11} /> View full minutes
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* ── BUDGET TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'budget' && (
          budgetsLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" /> Loading budget data…
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">No budget records found.</div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{budgets.length} budget record{budgets.length !== 1 ? 's' : ''}</p>
              {budgets.map(b => {
                const allocs = b.allocations || []
                const total = allocs.reduce((s, a) => s + (a.allocated || 0), 0)
                const spent = allocs.reduce((s, a) => s + (a.spent || 0), 0)
                const utilPct = total > 0 ? Math.round((spent / total) * 100) : 0
                return (
                  <div key={b.PK} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{b.panchayatId}</p>
                        <p className="text-xs text-muted-foreground">FY {b.year} · Updated {relTime(b.updatedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{fmtCurrency(total)} allocated</p>
                        <p className="text-xs text-muted-foreground">{fmtCurrency(spent)} spent · {utilPct}% utilised</p>
                      </div>
                    </div>
                    {allocs.length > 0 && (
                      <div className="divide-y divide-border">
                        {allocs.map((a, i) => {
                          const pct = a.allocated > 0 ? Math.round(((a.spent || 0) / a.allocated) * 100) : 0
                          return (
                            <div key={i} className="px-5 py-3 flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{a.category || a.head || `Item ${i + 1}`}</p>
                                <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-foreground'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-medium">{fmtCurrency(a.spent || 0)} / {fmtCurrency(a.allocated)}</p>
                                <p className="text-xs text-muted-foreground">{pct}%</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Side panel — case detail */}
      {selectedCase && (
        <CaseDetail
          caseId={selectedCase}
          onClose={() => setSelectedCase(null)}
          onFollowup={(c) => { setFollowupCase(c); setSelectedCase(null) }}
        />
      )}

      {/* Side panel — meeting detail */}
      {selectedMeeting && (
        <MeetingDetail
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}

      {/* Follow-up email modal */}
      {followupCase && (
        <FollowupModal
          caseItem={followupCase}
          onClose={() => setFollowupCase(null)}
          onSent={loadCases}
        />
      )}
    </div>
  )
}