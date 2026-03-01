import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mic, MicOff, Search, Loader2, Download,
  Send, FileText, CheckCircle2, ChevronDown, ChevronUp, Volume2, ExternalLink,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { exportSchemesPdf } from '@/utils/pdfExport'
import { useLanguage, TRANSCRIBE_LANGS, TTS_LANGS } from '@/context/LanguageContext'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export default function SchemeSearch() {
  const navigate = useNavigate()
  const { language, t, getTranscribeLang, getTtsLang, translateText } = useLanguage()
  const [query, setQuery] = useState('')
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [speaking, setSpeaking] = useState(null)
  const [spokenLang, setSpokenLang] = useState('en')
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  // ── Voice recording via MediaRecorder → Transcribe ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(blob)
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      toast.error(t('mic_denied'))
    }
  }

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
    setRecording(false)
  }

  const transcribeAudio = async (blob) => {
    setTranscribing(true)
    try {
      const fd = new FormData()
      fd.append('file', blob, 'recording.webm')
      fd.append('language', spokenLang)
      const res = await axios.post(`${AI_BASE}/ai/voice/transcribe`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      const transcript = res.data.transcript || res.data.text || ''
      if (transcript) {
        setQuery(transcript)
        toast.success(t('voice_transcribed'))
      } else {
        toast.error(t('could_not_transcribe'))
      }
    } catch {
      toast.error(t('transcription_failed'))
    } finally {
      setTranscribing(false)
    }
  }

  // ── AI Scheme Search ──
  const searchSchemes = async () => {
    if (!query.trim()) { toast.error(t('enter_query_first')); return }
    setLoading(true)
    setSchemes([])
    try {
      const res = await axios.post(`${AI_BASE}/ai/schemes/search`, {
        query,
        language,
        profile: {},
      }, { timeout: 60000 })
      const results = res.data.schemes || []
      setSchemes(results)
      if (results.length === 0) toast(t('no_matching_schemes'))
    } catch {
      toast.error(t('scheme_search_failed'))
    } finally {
      setLoading(false)
    }
  }

  // ── TTS: Read scheme aloud ──
  const speakScheme = async (scheme, idx) => {
    setSpeaking(idx)
    try {
      const text = `${scheme.name}. ${scheme.description}. ${scheme.benefit}. ${scheme.eligibility}. ${scheme.next_steps}`
      const ttsLang = getTtsLang()
      // Translate text to TTS language if needed
      const ttsText = language !== ttsLang ? await translateText(text, { from: language, to: ttsLang }) : text
      const res = await axios.post(`${AI_BASE}/ai/voice/synthesize`, {
        text: ttsText, language: ttsLang,
      }, { responseType: 'blob', timeout: 30000 })
      const url = URL.createObjectURL(res.data)
      const audio = new Audio(url)
      audio.onended = () => { setSpeaking(null); URL.revokeObjectURL(url) }
      audio.play()
    } catch {
      toast.error(t('voice_playback_failed'))
      setSpeaking(null)
    }
  }

  // ── Relevance badge ──
  const relevanceVariant = (r) => {
    if (r === 'high') return 'default'
    if (r === 'medium') return 'secondary'
    return 'muted'
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('back_to_dashboard')}
      </button>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('scheme_navigator')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('scheme_subtitle')}</p>
      </div>

      {/* Query input */}
      <Card>
        <CardContent className="py-5 space-y-4">
          {/* Voice button */}
          <div className="flex flex-col items-center gap-2">
            {/* Spoken language selector */}
            <div className="flex items-center gap-2 mb-1">
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
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${recording
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : transcribing
                  ? 'bg-secondary text-muted-foreground cursor-wait'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
            >
              {transcribing ? <Loader2 size={22} className="animate-spin" /> : recording ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <p className="text-xs text-muted-foreground">
              {transcribing ? t('transcribing') : recording ? t('recording_tap_stop') : t('tap_to_ask')}
            </p>
          </div>

          {/* Text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchSchemes()}
              placeholder={t('search_placeholder')}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={searchSchemes} disabled={loading || !query.trim()} loading={loading}>
              <Search size={14} /> {t('search')}
            </Button>
          </div>

          {/* Show query if set */}
          {query && !loading && (
            <div className="flex items-start gap-3 bg-secondary/30 rounded-md p-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Mic size={11} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('your_question')}</p>
                <p className="text-sm leading-relaxed">{query}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 size={24} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">{t('searching_schemes')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('matching_schemes')}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {schemes.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('ai_recommendations')}</h2>
            <span className="text-xs text-muted-foreground">{schemes.length} {t('schemes_found')}</span>
          </div>

          {schemes.map((scheme, idx) => {
            const isExpanded = expanded === idx
            return (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText size={15} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{scheme.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{scheme.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={relevanceVariant(scheme.relevance)} className="shrink-0 capitalize">
                        {scheme.relevance || 'match'}
                      </Badge>
                      <button
                        onClick={() => speakScheme(scheme, idx)}
                        disabled={speaking !== null}
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                        title={t('read_aloud')}
                      >
                        {speaking === idx ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} className="text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs items-end">
                    <div>
                      <p className="text-muted-foreground">{t('benefit')}</p>
                      <p className="font-medium mt-0.5">{scheme.benefit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('funding')}</p>
                      <p className="font-medium mt-0.5">{scheme.funding_source || 'Central'}</p>
                    </div>
                    <div>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(scheme.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium w-fit"
                      >
                        <ExternalLink size={10} />
                        {t('view_on_google')}
                      </a>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('eligibility')}</p>
                    <p className="text-xs">{scheme.eligibility}</p>
                  </div>

                  <button
                    onClick={() => setExpanded(isExpanded ? null : idx)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? t('less_details') : t('more_details')}
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 pt-1 border-t border-border">
                      {scheme.required_docs?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('required_documents')}</p>
                          <ul className="space-y-0.5">
                            {scheme.required_docs.map((doc, di) => (
                              <li key={di} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <CheckCircle2 size={10} className="mt-0.5 shrink-0" /> {doc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{t('next_steps')}</p>
                        <p className="text-xs">{scheme.next_steps}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                exportSchemesPdf(schemes, query)
                toast.success('PDF downloaded')
              }}
            >
              <Download size={14} /> {t('download_report')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
