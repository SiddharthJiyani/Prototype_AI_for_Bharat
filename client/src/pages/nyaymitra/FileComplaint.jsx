import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Download, Send, MessageSquare, Loader2, AlertCircle, CheckCircle2, User, MapPin, Pencil } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getUserId } from '@/utils/userId'

const STEPS = ['Input', 'Review', 'Confirm']

export default function FileComplaint() {
  const [step, setStep] = useState(0)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [language, setLanguage] = useState('hi')
  const [category, setCategory] = useState(null)
  const [notice, setNotice] = useState(null)
  const [caseId, setCaseId] = useState(null)
  const [error, setError] = useState(null)
  const [respondent, setRespondent] = useState({ name: '', designation: '', address: '' })
  const [editingNotice, setEditingNotice] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const navigate = useNavigate()

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.start()
      setRecording(true)
      setError(null)
    } catch (err) {
      toast.error('Microphone access denied')
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
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          const formData = new FormData()
          formData.append('audio', audioBlob)
          formData.append('language', language)

          // Call backend voice transcribe (which calls AWS Transcribe)
          const response = await axios.post('/api/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          })

          setTranscript(response.data.transcript || '')
          toast.success('Transcription complete')
          setStep(1)
          resolve()
        } catch (err) {
          const errMsg = err.response?.data?.error || 'Transcription failed'
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
      const catResponse = await axios.post('/ai/legal/categorize', {
        transcript,
        language,
      })
      setCategory(catResponse.data)

      // Step 2: Generate notice
      const noticeResponse = await axios.post('/ai/legal/generate-notice', {
        transcript,
        language,
        category: catResponse.data.category,
        respondent: respondent.name ? respondent : undefined,
      })
      setNotice(noticeResponse.data)
      setStep(1)
      toast.success('Notice generated')
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to generate notice'
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
      const response = await axios.post('/api/cases', {
        userId: getUserId(),
        type: category?.category || 'wage-dispute',
        description: transcript,
        transcript,
        language,
        notice: notice.notice_en,
        notice_hi: notice.explanation_hi,
        panchayatId: 'generic',
      })

      setCaseId(response.data.caseId)
      toast.success('Case filed successfully!')
      setStep(2)
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to file case'
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  // Download notice as professionally formatted PDF
  const downloadNotice = () => {
    if (!notice) return

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
      doc.text(`Category: ${category.category}`, margin, y)
      y += 6
      if (notice.law_cited) {
        doc.setFont('helvetica', 'italic')
        doc.text(`Under: ${notice.law_cited}`, margin, y)
        y += 8
      }
    }

    // Notice body
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(notice.notice_en, usable)
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(line, margin, y)
      y += 5
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
    doc.text('Generated by IntegratedGov AI — NyayMitra Legal Aid Platform', pageWidth / 2, y, { align: 'center' })
    doc.text('This is a computer-generated document.', pageWidth / 2, y + 4, { align: 'center' })

    doc.save(`Legal_Notice_${caseId || 'Draft'}.pdf`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/nyaymitra')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Services
      </button>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">File Legal Complaint</h1>
        <p className="text-sm text-muted-foreground">Record or type your complaint and we'll generate a legal notice using AI</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border transition-colors ${
              i <= step
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground bg-transparent'
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
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
            <CardTitle className="text-sm">Voice or Text Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language selector */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Language</p>
              <div className="flex gap-1">
                {[
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'en', label: 'English' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    disabled={recording}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      language === l.code
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-foreground'
                    } disabled:opacity-50`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording UI */}
            <div className="flex flex-col items-center gap-4 py-6 border rounded-lg border-border/50 bg-secondary/30">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                  recording
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : (recording ? <MicOff size={24} /> : <Mic size={24} />)}
              </button>
              <p className="text-sm text-muted-foreground">
                {recording ? 'Recording… tap to stop' : loading ? 'Processing...' : 'Tap to record'}
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
              <label className="text-xs text-muted-foreground block mb-2">Or type your complaint:</label>
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
                'Generate Legal Notice'
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
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Complaint:</p>
                  <p className="text-sm leading-relaxed">{transcript}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated notice */}
          {notice && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Legal Notice (English)</h2>
                <button
                  onClick={() => setEditingNotice(!editingNotice)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={12} /> {editingNotice ? 'Done editing' : 'Edit notice'}
                </button>
              </div>
              <Card>
                <CardContent className="py-4">
                  {editingNotice ? (
                    <textarea
                      value={notice.notice_en}
                      onChange={e => setNotice(prev => ({ ...prev, notice_en: e.target.value }))}
                      rows={16}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    />
                  ) : (
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground overflow-auto max-h-60">
                      {notice.notice_en}
                    </pre>
                  )}
                </CardContent>
              </Card>
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
              <Download size={14} /> Download Notice
            </Button>
            <Button className="gap-2" onClick={fileCase} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Filing...
                </>
              ) : (
                <>
                  <Send size={14} /> File Case
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => { setStep(0); setError(null) }}>
              Back & Edit
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && caseId && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <CheckCircle2 size={24} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Case Filed Successfully</h2>
              <p className="text-sm text-muted-foreground">Your legal notice has been registered in the system</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 px-6 py-3 text-center">
              <p className="text-xs text-muted-foreground">Case ID</p>
              <p className="text-lg font-bold font-mono mt-0.5">{caseId}</p>
            </div>
            <p className="text-xs text-muted-foreground">Your case is now in the system. You can track its progress and receive updates.</p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate(`/nyaymitra/cases/${caseId}`)}>
                View Case Details
              </Button>
              <Button onClick={() => navigate('/nyaymitra/cases')}>
                View All Cases
              </Button>
              <Button variant="ghost" onClick={() => { setStep(0); setTranscript(''); setCaseId(null); setNotice(null); setCategory(null) }}>
                File Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
