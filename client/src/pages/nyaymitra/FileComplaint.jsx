import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Download, Send, MessageSquare, Loader2, AlertCircle, CheckCircle2, User, MapPin, Pencil, Shield, Mail, KeyRound, X, Info } from 'lucide-react'
import { apiClient, aiClient } from '@/lib/axios'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getUserId } from '@/utils/userId'
import { useLanguage } from '@/context/LanguageContext'

const STEPS = ['Input', 'Review', 'Confirm']

export default function FileComplaint() {
  const { language, t } = useLanguage()
  const [step, setStep] = useState(0)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [category, setCategory] = useState(null)
  const [notice, setNotice] = useState(null)
  const [caseId, setCaseId] = useState(null)
  const [error, setError] = useState(null)
  const [respondent, setRespondent] = useState({ name: '', designation: '', address: '' })
  const [editingNotice, setEditingNotice] = useState(false)
  // eSign modal state
  const [isSigned, setIsSigned] = useState(false)
  const [signedAt, setSignedAt] = useState(null)
  const [maskedAadhaar, setMaskedAadhaar] = useState('')
  const [showEsignModal, setShowEsignModal] = useState(false)
  const [aadhaarInput, setAadhaarInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpInput, setOtpInput] = useState('')
  const [signingLoading, setSigningLoading] = useState(false)
  // email dispatch state
  const [respondentEmail, setRespondentEmail] = useState('')
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [dispatchResult, setDispatchResult] = useState(null)
  // guarded editor state
  const [guardedSegments, setGuardedSegments] = useState([])
  const [noticeFields, setNoticeFields] = useState({})
  const [spokenLang, setSpokenLang] = useState('hi') // spoken language for transcription (independent of UI language)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const navigate = useNavigate()

  // ── Draft persistence ──────────────────────────────────────────────────────
  const DRAFT_KEY = 'nyaymitra_complaint_draft'

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.transcript) setTranscript(draft.transcript)
        if (draft.category) setCategory(draft.category)
        if (draft.notice) setNotice(draft.notice)
        if (draft.respondent) setRespondent(draft.respondent)
        if (typeof draft.step === 'number' && draft.step < 2) setStep(draft.step)
      }
    } catch { /* ignore corrupt data */ }
  }, [])

  // Save draft whenever key state changes (but not after final filing)
  useEffect(() => {
    if (caseId) return // already filed, don't overwrite
    const draft = { transcript, category, notice, respondent, step }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [transcript, category, notice, respondent, step, caseId])

  // Clear draft after successful filing
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  // Parse notice into guarded segments whenever notice changes
  useEffect(() => {
    if (!notice?.notice_en) { setGuardedSegments([]); setNoticeFields({}); return }
    const text = notice.notice_en
    const parts = []
    const regex = /\[([^\]]+)\]/g
    let lastIndex = 0
    let match
    const fields = {}
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'static', text: text.slice(lastIndex, match.index) })
      const key = match[1]
      parts.push({ type: 'field', key })
      if (!(key in fields)) fields[key] = ''
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) parts.push({ type: 'static', text: text.slice(lastIndex) })
    setGuardedSegments(parts)
    setNoticeFields(fields)
  }, [notice])

  // Reconstruct final notice with user-filled field values
  const reconstructedNotice = guardedSegments.length
    ? guardedSegments.map(s => s.type === 'static' ? s.text : (noticeFields[s.key] || `[${s.key}]`)).join('')
    : (notice?.notice_en || '')

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.start()
      setRecording(true)
      setError(null)
    } catch (err) {
      toast.error(t('mic_denied'))
    }
  }

  // Stop recording & transcribe
  const stopRecording = async () => {
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        setRecording(false)
        setLoading(true)
        setError(null)

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          formData.append('language', spokenLang)

          // Call backend voice transcribe (which calls AWS Transcribe)
          const response = await apiClient.post('/api/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          })

          setTranscript(response.data.transcript || '')
          toast.success(t('voice_transcribed'))
          // Stay on step 0 so user can review transcript, fill respondent, and click Generate Notice
          resolve()
        } catch (err) {
          const errMsg = err.response?.data?.error || t('transcription_failed')
          setError(errMsg)
          toast.error(errMsg)
          resolve()
        } finally {
          setLoading(false)
        }
      }
      mediaRecorderRef.current.stop()
    })
  }

  // Generate legal notice from transcript
  const generateNotice = async () => {
    if (!transcript) return

    setLoading(true)
    setError(null)

    try {
      // Step 1: Categorize
      const catResponse = await aiClient.post('/legal/categorize', {
        transcript,
        language,
      })
      setCategory(catResponse.data)

      // Step 2: Generate notice
      const noticeResponse = await aiClient.post('/legal/generate-notice', {
        transcript,
        language,
        category: catResponse.data.category,
        respondent: respondent.name ? respondent : undefined,
      })
      setNotice(noticeResponse.data)
      setStep(1)
      toast.success(t('notice_generated'))
    } catch (err) {
      const errMsg = err.response?.data?.error || t('failed_generate_notice')
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // File case to backend
  const fileCase = async () => {
    if (!transcript || !notice) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/api/cases', {
        userId: getUserId(),
        type: category?.category || 'wage-dispute',
        description: transcript,
        transcript,
        language,
        notice: reconstructedNotice,
        notice_hi: notice.explanation_hi,
        lawCited: notice.law_cited,
        isSigned,
        signedAt: signedAt || null,
        maskedAadhaar: maskedAadhaar || null,
        panchayatId: 'generic',
      })

      setCaseId(response.data.caseId)
      clearDraft()
      toast.success(t('case_filed_success'))
      setStep(2)
    } catch (err) {
      const errMsg = err.response?.data?.error || t('failed_file_case')
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // Download notice as professionally formatted PDF
  const downloadNotice = () => {
    if (!notice) return

    // Sanitize text: replace chars that jsPDF Helvetica can't render
    const sanitize = (str) =>
      (str || '')
        .replace(/₹/g, 'Rs.')
        .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
        .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
        .replace(/\u2014/g, ' -- ')         // em dash
        .replace(/\u2013/g, '-')            // en dash
        .replace(/\u2026/g, '...')          // ellipsis
        .replace(/[^\x00-\x7F]/g, '')       // strip any remaining non-ASCII

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const usable = pageWidth - margin * 2
    let y = 25

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('LEGAL NOTICE', pageWidth / 2, y, { align: 'center' })
    y += 10

    // Divider line
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Reference & date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Ref: ${caseId || 'DRAFT'}`, margin, y)
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, y, { align: 'right' })
    y += 8

    // Category
    if (category?.category) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(`Category: ${sanitize(category.category)}`, margin, y)
      y += 6
      if (notice.law_cited) {
        doc.setFont('helvetica', 'italic')
        doc.text(`Under: ${sanitize(notice.law_cited)}`, margin, y)
        y += 8
      }
    }

    // Notice body — always set font right before rendering
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const bodyText = sanitize(reconstructedNotice)
    const lines = doc.splitTextToSize(bodyText, usable)
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(line, margin, y)
      y += 5.5
    }

    // Signature block (if eSigned)
    if (isSigned && signedAt) {
      y += 4
      if (y > 258) { doc.addPage(); y = 20 }
      doc.setDrawColor(80, 200, 120)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80, 200, 120)
      doc.text('DIGITALLY SIGNED — SECTION 5, INFORMATION TECHNOLOGY ACT 2000', margin, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      doc.text(`Aadhaar (masked): ${maskedAadhaar}`, margin, y)
      doc.text(`Signed At: ${new Date(signedAt).toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' })
      y += 4
      doc.setDrawColor(80, 200, 120)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5
      doc.setTextColor(0)
    }

    // Footer divider
    y += 5
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setDrawColor(180)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text('Generated by IntegratedGov AI -- NyayMitra Legal Aid Platform', pageWidth / 2, y, { align: 'center' })
    doc.text('This is a computer-generated document.', pageWidth / 2, y + 4, { align: 'center' })

    doc.save(`Legal_Notice_${caseId || 'Draft'}.pdf`)
  }

  // ── Aadhaar eSign handlers ───────────────────────────────────────────────
  const handleSendOtp = () => {
    if (!/^\d{12}$/.test(aadhaarInput)) { toast.error('Enter a valid 12-digit Aadhaar number'); return }
    setOtpSent(true)
    toast.success('OTP sent to Aadhaar-linked mobile (Demo: use 123456)')
  }

  const handleVerifyOtp = () => {
    if (otpInput !== '123456') { toast.error('Invalid OTP. (Demo: enter 123456)'); return }
    setSigningLoading(true)
    setTimeout(() => {
      setMaskedAadhaar('XXXX-XXXX-' + aadhaarInput.slice(-4))
      setSignedAt(new Date().toISOString())
      setIsSigned(true)
      setShowEsignModal(false)
      setOtpSent(false)
      setAadhaarInput('')
      setOtpInput('')
      setSigningLoading(false)
      toast.success('Notice digitally signed under IT Act 2000!')
    }, 1200)
  }

  // ── Email dispatch + Section 65B certificate ─────────────────────────────
  const dispatchEmail = async () => {
    if (!respondentEmail || !/\S+@\S+\.\S+/.test(respondentEmail)) {
      toast.error('Enter a valid respondent email address')
      return
    }
    if (!caseId) { toast.error('Case not filed yet'); return }
    setDispatchLoading(true)
    try {
      const res = await apiClient.post(`/api/cases/${caseId}/dispatch-email`, {
        respondentEmail,
        noticeText: reconstructedNotice,
        isSigned,
        signedAt,
        maskedAadhaar,
        category: category?.category,
        lawCited: notice?.law_cited,
      })
      setDispatchResult(res.data)
      toast.success('Notice dispatched! Section 65B certificate ready.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch notice')
    } finally {
      setDispatchLoading(false)
    }
  }

  const generate65BCert = () => {
    if (!dispatchResult) return
    const sanitize = (s) => (s || '').replace(/[^\x00-\x7F]/g, '').replace(/₹/g, 'Rs.')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const usable = pageWidth - margin * 2
    let y = 25

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('SECTION 65B CERTIFICATE', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Indian Evidence Act, 1872 -- Electronic Record Certificate', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setDrawColor(0); doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    const fields = [
      ['Case ID', caseId],
      ['Document', 'Legal Notice'],
      ['Served via', 'Electronic Mail (SMTP / Gmail)'],
      ['Recipient Email', dispatchResult.respondentEmail],
      ['Dispatch Timestamp', new Date(dispatchResult.sentAt).toLocaleString('en-IN')],
      ['SMTP Message ID', sanitize(dispatchResult.messageId)],
      ['Server IP', dispatchResult.serverIp],
      ['Legal Category', sanitize(category?.category || 'Legal Notice')],
      ['Applicable Law', sanitize(notice?.law_cited || 'N/A')],
      ...(isSigned ? [['eSign Status', `Digitally Signed -- Aadhaar ${maskedAadhaar}`], ['Signed At', new Date(signedAt).toLocaleString('en-IN')]] : []),
    ]

    doc.setFontSize(9)
    for (const [label, value] of fields) {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ':', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value || ''), margin + 58, y)
      y += 6
    }

    y += 4
    doc.setDrawColor(180); doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Certification Statement', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const cert = 'I hereby certify that the information in this certificate is accurate. This electronic record was transmitted via secure SMTP relay. This certificate is issued in accordance with Section 65B of the Indian Evidence Act, 1872 (as amended by the IT Act, 2000) and constitutes valid primary evidence of the electronic communication described herein.'
    const certLines = doc.splitTextToSize(cert, usable)
    for (const line of certLines) {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, margin, y)
      y += 5
    }

    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Generated by: IntegratedGov AI -- NyayMitra Legal Aid Platform', margin, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text('System Timestamp: ' + new Date().toLocaleString('en-IN'), margin, y)

    doc.save(`65B_Certificate_${caseId}.pdf`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/nyaymitra')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('back_to_services')}
      </button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold flex-1">{t('file_complaint')}</h1>
          <button
            onClick={() => navigate('/nyaymitra/legal-guide')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-md border border-border hover:border-primary/30 hover:bg-primary/5"
            title="How this works — Legal Guide"
          >
            <Info size={13} /> How it works
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t('complaint_subtitle')}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border transition-colors ${i <= step
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground bg-transparent'
              }`}>
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{i === 0 ? t('step_input') : i === 1 ? t('step_review') : t('step_confirm')}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Step 0: Input */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('voice_complaint')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Spoken language selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{t('spoken_language') || 'I will speak in'}:</label>
              <select
                value={spokenLang}
                onChange={(e) => setSpokenLang(e.target.value)}
                className="text-xs bg-secondary border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="en">English</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            {/* Recording UI */}
            <div className="flex flex-col items-center gap-4 py-6 border rounded-lg border-border/50 bg-secondary/30">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50 ${recording
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : (recording ? <MicOff size={24} /> : <Mic size={24} />)}
              </button>
              <p className="text-sm text-muted-foreground">
                {recording ? t('recording_tap_stop') : loading ? t('processing') : t('speak_complaint')}
              </p>
              {recording && (
                <div className="flex gap-1 items-end h-6">
                  {[3, 5, 4, 7, 3, 6, 4, 5, 3].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-bounce"
                      style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Or type */}
            <div className="relative">
              <label className="text-xs text-muted-foreground block mb-2">{t('type_complaint_placeholder')}</label>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder={language === 'hi' ? 'मुझे MGNREGA की मजदूरी नहीं मिली है...' : 'I have not received my MGNREGA wages...'}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Respondent details (optional) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <User size={12} /> Respondent Details <span className="text-muted-foreground/60">(optional — improves notice quality)</span>
              </p>
              <div className="grid gap-2">
                <input
                  value={respondent.name}
                  onChange={e => setRespondent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={language === 'hi' ? 'प्राप्तकर्ता का नाम — जैसे: खंड विकास अधिकारी' : 'Recipient name — e.g. Block Development Officer'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={respondent.designation}
                  onChange={e => setRespondent(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder={language === 'hi' ? 'पदनाम — जैसे: कार्यक्रम अधिकारी, MGNREGA' : 'Designation — e.g. Programme Officer, MGNREGA'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={respondent.address}
                  onChange={e => setRespondent(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={language === 'hi' ? 'पता — जैसे: जिला कार्यालय, बिहार' : 'Address — e.g. District Office, Bihar'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!transcript || loading}
              onClick={generateNotice}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" /> Generating...
                </>
              ) : (
                t('generate_notice')
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Review */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Category badge */}
          {category && (
            <div className="flex gap-2 items-center p-3 rounded-lg bg-secondary/50 border border-border">
              <CheckCircle2 size={16} className="text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Categorized as:</p>
                <p className="text-sm font-medium">{category.category}</p>
              </div>
              <Badge variant="govgreen">{Math.round(category.confidence * 100)}% match</Badge>
            </div>
          )}

          {/* Transcript */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <MessageSquare size={13} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('your_complaint')}:</p>
                  <p className="text-sm leading-relaxed">{transcript}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guarded notice editor */}
          {notice && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('legal_notice_gen')}</h2>
                {isSigned && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Shield size={12} /> IT Act Signed &mdash; {maskedAadhaar}
                  </div>
                )}
              </div>
              {/* Locked preview */}
              <Card>
                <CardContent className="py-4">
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground overflow-auto max-h-52">
                    {reconstructedNotice}
                  </pre>
                </CardContent>
              </Card>
              {/* Editable fact fields only */}
              {guardedSegments.some(s => s.type === 'field') && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
                  <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <Pencil size={11} /> Edit facts only &mdash; legal boilerplate is locked
                  </p>
                  <div className="grid gap-2">
                    {[...new Set(guardedSegments.filter(s => s.type === 'field').map(s => s.key))].map(key => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground block mb-1">{key}</label>
                        <input
                          value={noticeFields[key] || ''}
                          onChange={e => setNoticeFields(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Enter ${key}...`}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hindi explanation */}
          {notice && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">सरल व्याख्या (Simple Hindi Explanation)</h2>
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm leading-relaxed font-devanagari">{notice.explanation_hi}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" className="gap-2" onClick={downloadNotice} disabled={loading}>
              <Download size={14} /> {t('download_notice')}
            </Button>
            {!isSigned ? (
              <Button
                variant="outline"
                className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setShowEsignModal(true)}
              >
                <Shield size={14} /> Sign Notice (eSign)
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Shield size={12} /> Signed &mdash; {maskedAadhaar}
              </div>
            )}
            <Button className="gap-2" onClick={fileCase} disabled={loading}>
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Filing...</>
              ) : (
                <><Send size={14} /> {t('confirm_file')}</>
              )}
            </Button>
            <Button variant="ghost" onClick={() => { setStep(0); setError(null) }}>
              {t('back_and_edit')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm + Dispatch */}
      {step === 2 && caseId && (
        <div className="space-y-4">
          {/* Success card */}
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <CheckCircle2 size={24} className="text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold">{t('case_filed_success')}</h2>
                <p className="text-sm text-muted-foreground">{t('notice_registered')}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 px-6 py-3">
                <p className="text-xs text-muted-foreground">{t('case_id_label')}</p>
                <p className="text-lg font-bold font-mono mt-0.5">{caseId}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                <Button variant="outline" onClick={() => navigate(`/nyaymitra/cases/${caseId}`)}>{t('view_case')}</Button>
                <Button onClick={() => navigate('/nyaymitra/cases')}>{t('view_all')}</Button>
                <Button variant="ghost" onClick={() => { setStep(0); setTranscript(''); setCaseId(null); setNotice(null); setCategory(null); setIsSigned(false); setDispatchResult(null) }}>{t('file_another')}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Digital Dispatch */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail size={14} className="text-primary" /> Send Notice Digitally
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground">
                Indian courts accept digitally served notices when accompanied by a <strong>Section 65B Evidence Act Certificate</strong> — generated automatically after dispatch.
              </p>
              {!dispatchResult ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={respondentEmail}
                      onChange={e => setRespondentEmail(e.target.value)}
                      placeholder="Respondent's email address"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button onClick={dispatchEmail} disabled={dispatchLoading || !respondentEmail} className="gap-1.5 shrink-0">
                      {dispatchLoading ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Mail size={13} /> Dispatch</>}
                    </Button>
                  </div>
                  {!isSigned && (
                    <p className="text-xs text-amber-400 flex items-center gap-1.5">
                      <Shield size={11} /> Tip: Go back to Review and eSign the notice to strengthen legal validity before dispatching.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-emerald-400">Notice dispatched successfully</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sent to: {dispatchResult.respondentEmail} &middot; {new Date(dispatchResult.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={generate65BCert}>
                    <Download size={14} /> Download Section 65B Certificate
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This certificate (with server timestamp, IP &amp; message ID) makes the digital delivery admissible as primary evidence under the Indian Evidence Act.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Physical RPAD Handoff Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Physical Delivery &mdash; Registered Post (RPAD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">
                For maximum legal strength, also send a physical copy via <strong>Registered Post with Acknowledgement Due (RPAD)</strong>.
              </p>
              {[
                { n: 1, text: 'Download and print the signed PDF notice.' },
                { n: 2, text: 'Go to your nearest post office and send it via Registered Post with AD (RPAD). Keep your postal receipt safely.' },
                { n: 3, text: 'When the green AD card returns signed by the recipient, keep it safely — that physical signature is your ultimate court proof of delivery.' },
              ].map(item => (
                <div key={item.n} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary mt-0.5">
                    {item.n}
                  </div>
                  <p className="text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2 mt-1" onClick={downloadNotice}>
                <Download size={14} /> Download PDF for Printing
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Aadhaar eSign Modal */}
      {showEsignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) { setShowEsignModal(false); setOtpSent(false) } }}>
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield size={14} className="text-primary" /> Aadhaar eSign
                </h3>
                <p className="text-xs text-muted-foreground">Electronic signature &mdash; Section 5, IT Act 2000</p>
              </div>
              <button onClick={() => { setShowEsignModal(false); setOtpSent(false); setAadhaarInput(''); setOtpInput('') }} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Aadhaar Number</label>
                <input
                  value={aadhaarInput}
                  onChange={e => setAadhaarInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter 12-digit Aadhaar"
                  maxLength={12}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
                />
              </div>

              {!otpSent ? (
                <Button className="w-full" onClick={handleSendOtp} disabled={aadhaarInput.length !== 12}>
                  Send OTP to Aadhaar-linked Mobile
                </Button>
              ) : (
                <>
                  <div className="p-2.5 rounded-md bg-primary/10 text-xs text-primary text-center">
                    OTP sent to Aadhaar-linked mobile &mdash; <span className="font-semibold">Demo: enter 123456</span>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Enter OTP</label>
                    <input
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
                    />
                  </div>
                  <Button className="w-full gap-2" onClick={handleVerifyOtp} disabled={otpInput.length !== 6 || signingLoading}>
                    {signingLoading
                      ? <><Loader2 size={14} className="animate-spin" /> Signing...</>
                      : <><KeyRound size={14} /> Verify &amp; Sign Notice</>}
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Demo prototype &mdash; no real Aadhaar data is stored or transmitted
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
