import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Clock, CheckCircle2, Circle, Loader2, AlertCircle, Mail, Shield } from 'lucide-react'
import { apiClient } from '@/lib/axios'
import { jsPDF } from 'jspdf'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useLanguage } from '@/context/LanguageContext'

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [caseData, setCaseData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState('')
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  useEffect(() => {
    if (id) {
      fetchCaseDetail()
    }
  }, [id])

  // 15-day countdown from dispatch date (or file date)
  useEffect(() => {
    if (!caseData) return
    const base = caseData.dispatchedAt || caseData.createdAt
    const deadline = new Date(base).getTime() + 15 * 86400000
    const tick = () => {
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        setCountdown('Deadline has passed')
        setDeadlinePassed(true)
        return
      }
      const days = Math.floor(remaining / 86400000)
      const hours = Math.floor((remaining % 86400000) / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      setCountdown(`${days}d ${hours}h ${mins}m remaining`)
    }
    tick()
    const timer = setInterval(tick, 60000)
    return () => clearInterval(timer)
  }, [caseData])

  const fetchCaseDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get(`/api/cases/${decodeURIComponent(id)}`)
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
      setError(err.response?.data?.error || t('loading_case_details'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center gap-3 min-h-screen">
        <Loader2 size={24} className="text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">{t('loading_case_details')}</p>
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
          <ArrowLeft size={14} /> {t('back_to_cases')}
        </button>
        <div className="flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{t('case_not_found')}</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/nyaymitra/cases')}>{t('back_to_cases')}</Button>
      </div>
    )
  }

  const statusVariant = (s) => {
    if (s === 'Filed') return 'secondary'
    if (s === 'In Progress') return 'warning'
    if (s === 'Resolved') return 'success'
    return 'muted'
  }

  const downloadNotice = () => {
    if (!caseData?.notice) return
    const sanitize = (str) =>
      (str || '')
        .replace(/₹/g, 'Rs.').replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"').replace(/\u2014/g, ' -- ')
        .replace(/\u2013/g, '-').replace(/\u2026/g, '...').replace(/[^\x00-\x7F]/g, '')

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const usable = pageWidth - margin * 2
    let y = 25

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('LEGAL NOTICE', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setDrawColor(0); doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`Ref: ${caseData.caseId}`, margin, y)
    doc.text(`Date: ${new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, y, { align: 'right' })
    y += 8

    if (caseData.type) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text(`Category: ${sanitize(caseData.type)}`, margin, y)
      y += 6
      if (caseData.lawCited) {
        doc.setFont('helvetica', 'italic')
        doc.text(`Under: ${sanitize(caseData.lawCited)}`, margin, y)
        y += 8
      }
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    const lines = doc.splitTextToSize(sanitize(caseData.notice), usable)
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, margin, y)
      y += 5.5
    }

    // eSign block if present
    if (caseData.isSigned && caseData.signedAt) {
      y += 4
      if (y > 258) { doc.addPage(); y = 20 }
      doc.setDrawColor(80, 200, 120); doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y); y += 5
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      doc.setTextColor(80, 200, 120)
      doc.text('DIGITALLY SIGNED \u2014 SECTION 5, INFORMATION TECHNOLOGY ACT 2000', margin, y); y += 4
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100)
      doc.text(`Aadhaar (masked): ${caseData.maskedAadhaar}`, margin, y)
      doc.text(`Signed At: ${new Date(caseData.signedAt).toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' }); y += 4
      doc.setDrawColor(80, 200, 120)
      doc.line(margin, y, pageWidth - margin, y); y += 5
      doc.setTextColor(0)
    }

    y += 5
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setDrawColor(180); doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y); y += 6
    doc.setFontSize(7); doc.setTextColor(120)
    doc.text('Generated by IntegratedGov AI -- NyayMitra Legal Aid Platform', pageWidth / 2, y, { align: 'center' })
    doc.text('This is a computer-generated document.', pageWidth / 2, y + 4, { align: 'center' })
    doc.save(`Legal_Notice_${caseData.caseId}.pdf`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/nyaymitra/cases')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('back_to_cases')}
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">{caseData.type || t('legal_case')}</h1>
          <p className="text-sm text-muted-foreground font-mono">{caseData.caseId}</p>
        </div>
        <Badge variant={statusVariant(caseData.status)}>{caseData.status || 'Filed'}</Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('case_details')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          {[
            { label: t('filed_on'), value: new Date(caseData.createdAt).toLocaleDateString('en-IN') },
            { label: t('case_type'), value: caseData.type || t('legal_dispute') },
            { label: t('language_label'), value: caseData.language === 'hi' ? 'हिंदी (Hindi)' : 'English' },
            { label: t('case_id'), value: caseData.caseId },
            { label: t('status'), value: caseData.status || t('filed') },
            { label: t('last_updated_label'), value: new Date(caseData.updatedAt).toLocaleDateString('en-IN') },
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
          <CardTitle className="text-sm">{t('your_complaint')}</CardTitle>
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
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">{t('legal_notice_gen')}</CardTitle>
              {caseData.isSigned && caseData.signedAt && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <Shield size={11} />
                  <span>eSigned · {caseData.maskedAadhaar}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground overflow-auto max-h-48 bg-secondary/30 px-3 py-2 rounded-md">
              {caseData.notice}
            </pre>
            <Button variant="outline" className="gap-2 mt-3 w-full" onClick={downloadNotice}>
              <Download size={14} /> {t('download_notice')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('case_progress')}</CardTitle>
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

      {/* 15-day Response Countdown */}
      {countdown && (
        <Card className={deadlinePassed ? 'border-destructive/30' : 'border-amber-500/30'}>
          <CardContent className="py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${deadlinePassed ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
              <Clock size={16} className={deadlinePassed ? 'text-destructive' : 'text-amber-400'} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">15-Day Response Deadline</p>
              <p className={`text-sm font-semibold mt-0.5 ${deadlinePassed ? 'text-destructive' : 'text-amber-400'}`}>{countdown}</p>
              {caseData?.dispatchedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notice dispatched: {new Date(caseData.dispatchedAt).toLocaleDateString('en-IN')}
                  {caseData.respondentEmail && <> &middot; {caseData.respondentEmail}</>}
                </p>
              )}
            </div>
            {deadlinePassed && (
              <Badge variant="destructive" className="shrink-0 text-xs">Overdue</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Digital dispatch status */}
      {caseData?.dispatchedAt && (
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <Mail size={14} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-emerald-400">Notice served digitally</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Email sent to {caseData.respondentEmail} on {new Date(caseData.dispatchedAt).toLocaleDateString('en-IN')}. A Section 65B certificate was generated at dispatch.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Physical RPAD Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Physical Delivery — Registered Post (RPAD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs text-muted-foreground">For court-proof physical delivery, follow these steps:</p>
          {[
            { n: 1, text: 'Download and print the signed Legal Notice PDF.' },
            { n: 2, text: 'Go to your nearest post office. Send the notice via Registered Post with Acknowledgement Due (RPAD). Keep your postal receipt.' },
            { n: 3, text: 'When the green AD card returns signed by the recipient, keep it safely — it is your undeniable court proof of delivery.' },
          ].map(item => (
            <div key={item.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
                {item.n}
              </div>
              <p className="text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => navigate('/nyaymitra/cases')} className="flex-1">
          {t('back_to_cases')}
        </Button>
      </div>
    </div>
  )
}
