import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mic, MicOff, Download, CheckCircle2, Loader2,
  Calendar, MapPin, Users, ClipboardList, IndianRupee, History, Trash2, ChevronRight,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { exportMeetingMinutesPdf } from '@/utils/pdfExport'
import { useLanguage } from '@/context/LanguageContext'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'
const SERVER_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const PANCHAYAT_ID = 'default'  // TODO: pull from user context when multi-panchayat is implemented

export default function MeetingMinutes() {
  const navigate = useNavigate()
  const { language, t, getTranscribeLang, translateText, translateBatch } = useLanguage()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [minutes, setMinutes] = useState(null)
  const [rawMinutes, setRawMinutes] = useState(null)   // English minutes before translation → used for PDF
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])           // list of past meetings
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [savedId, setSavedId] = useState(null)         // meetingId after save
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // ── Meeting metadata form ──
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('Panchayat Bhawan')
  const [attendees, setAttendees] = useState('24')
  const [meetingType, setMeetingType] = useState('Gram Sabha')
  const [spokenLang, setSpokenLang] = useState('hi')

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await axios.get(`${SERVER_BASE}/api/meetings?panchayatId=${PANCHAYAT_ID}&limit=20`)
      setHistory(res.data.meetings || [])
    } catch { /* silently fail */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Auto-save a generated MOM ──
  const saveMom = async (rawMins, savedTranscript) => {
    try {
      const res = await axios.post(`${SERVER_BASE}/api/meetings`, {
        panchayatId: PANCHAYAT_ID,
        meetingDate,
        location,
        attendees: Number(attendees) || 0,
        meetingType,
        transcript: savedTranscript,
        minutes: rawMins,
      })
      setSavedId(res.data.meetingId)
      loadHistory()   // refresh sidebar list
    } catch {
      // non-critical, don't show error toast
    }
  }

  // ── Open a past meeting ──
  const openPastMeeting = async (item) => {
    try {
      const res = await axios.get(
        `${SERVER_BASE}/api/meetings/${PANCHAYAT_ID}/${encodeURIComponent(item.SK)}`
      )
      const data = res.data
      setMeetingDate(data.meetingDate)
      setLocation(data.location)
      setAttendees(String(data.attendees))
      setMeetingType(data.meetingType)
      setTranscript(data.transcript || '')
      setRawMinutes(data.minutes)
      setMinutes(data.minutes)
      setSavedId(data.meetingId)
      setShowHistory(false)
    } catch {
      toast.error('Could not load meeting')
    }
  }

  // ── Delete a past meeting ──
  const deletePastMeeting = async (item, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`${SERVER_BASE}/api/meetings/${PANCHAYAT_ID}/${encodeURIComponent(item.SK)}`)
      setHistory(prev => prev.filter(h => h.SK !== item.SK))
      toast.success('Meeting deleted')
    } catch {
      toast.error('Could not delete')
    }
  }

  // ── Real audio recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => stream.getTracks().forEach(t => t.stop())
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    } catch {
      toast.error(t('mic_denied'))
    }
  }

  const stopRecording = async () => {
    clearInterval(timerRef.current)
    setRecording(false)

    if (mediaRef.current?.state !== 'recording') return
    await new Promise(resolve => {
      mediaRef.current.onstop = resolve
      mediaRef.current.stop()
    })

    // Stop any lingering tracks
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop())

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    await processRecording(blob)
  }

  // ── Transcribe → Generate minutes ──
  const processRecording = async (blob) => {
    setProcessing(true)
    try {
      // Step 1: Transcribe
      const fd = new FormData()
      fd.append('file', blob, 'meeting.webm')
      fd.append('language', spokenLang)
      const transcribeRes = await axios.post(`${AI_BASE}/ai/voice/transcribe`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const text = transcribeRes.data.transcript || transcribeRes.data.text || ''
      if (!text) { toast.error(t('could_not_transcribe')); setProcessing(false); return }
      setTranscript(text)

      // Step 2: Generate minutes from transcript
      const minutesRes = await axios.post(`${AI_BASE}/ai/meetings/generate-minutes`, {
        transcript: text,
        date: meetingDate,
        location,
        attendees: Number(attendees) || 0,
        meeting_type: meetingType,
      }, { timeout: 90000 })

      setRawMinutes(minutesRes.data)   // keep English original for PDF
      setMinutes(minutesRes.data)

      // Auto-save immediately (use English raw data)
      saveMom(minutesRes.data, text)

      // Translate minutes to selected language if not English
      if (language !== 'en') {
        try {
          const md = minutesRes.data
          const [agenda, decisions, actionTasks, schemes, summary] = await Promise.all([
            md.agenda_items?.length ? translateBatch(md.agenda_items) : Promise.resolve(md.agenda_items),
            md.key_decisions?.length ? translateBatch(md.key_decisions) : Promise.resolve(md.key_decisions),
            md.action_items?.length
              ? Promise.all(md.action_items.map(async (a) => {
                if (typeof a === 'string') return translateText(a)
                return { ...a, task: await translateText(a.task || '') }
              }))
              : Promise.resolve(md.action_items),
            md.schemes_discussed?.length ? translateBatch(md.schemes_discussed) : Promise.resolve(md.schemes_discussed),
            md.summary_hindi ? translateText(md.summary_hindi) : Promise.resolve(md.summary_hindi),
          ])
          setMinutes(prev => ({
            ...prev,
            agenda_items: agenda,
            key_decisions: decisions,
            action_items: actionTasks,
            schemes_discussed: schemes,
            summary_hindi: summary,
          }))
        } catch {
          // keep original if translation fails
        }
      }

      toast.success(t('minutes_generated'))
    } catch (err) {
      toast.error(t('failed_generate_minutes'))
    } finally {
      setProcessing(false)
    }
  }

  // ── Retry generating minutes from saved transcript ──
  const retryGenerate = async () => {
    if (!transcript) return
    setProcessing(true)
    try {
      const minutesRes = await axios.post(`${AI_BASE}/ai/meetings/generate-minutes`, {
        transcript,
        date: meetingDate,
        location,
        attendees: Number(attendees) || 0,
        meeting_type: meetingType,
      }, { timeout: 90000 })
      setRawMinutes(minutesRes.data)
      setMinutes(minutesRes.data)
      saveMom(minutesRes.data, transcript)
      if (language !== 'en') {
        try {
          const md = minutesRes.data
          const [agenda, decisions, actionTasks, schemes, summary] = await Promise.all([
            md.agenda_items?.length ? translateBatch(md.agenda_items) : Promise.resolve(md.agenda_items),
            md.key_decisions?.length ? translateBatch(md.key_decisions) : Promise.resolve(md.key_decisions),
            md.action_items?.length
              ? Promise.all(md.action_items.map(async (a) => {
                if (typeof a === 'string') return translateText(a)
                return { ...a, task: await translateText(a.task || '') }
              }))
              : Promise.resolve(md.action_items),
            md.schemes_discussed?.length ? translateBatch(md.schemes_discussed) : Promise.resolve(md.schemes_discussed),
            md.summary_hindi ? translateText(md.summary_hindi) : Promise.resolve(md.summary_hindi),
          ])
          setMinutes(prev => ({ ...prev, agenda_items: agenda, key_decisions: decisions, action_items: actionTasks, schemes_discussed: schemes, summary_hindi: summary }))
        } catch { /* keep original */ }
      }
      toast.success(t('minutes_generated'))
    } catch {
      toast.error(t('failed_generate_minutes'))
    } finally {
      setProcessing(false)
    }
  }

  // ── Download as PDF ──
  const downloadMinutes = () => {
    if (!minutes) return
    // Use English (rawMinutes) so PDF fonts render correctly
    exportMeetingMinutesPdf({ minutes: rawMinutes || minutes, meetingDate, location, attendees, meetingType, transcript })
    toast.success(t('pdf_downloaded'))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('back_to_dashboard')}
      </button>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('meeting_minutes_generator')}</h1>
          <button
            onClick={() => { setShowHistory(h => !h); if (!showHistory) loadHistory() }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors"
          >
            <History size={13} /> Past Meetings {history.length > 0 && `(${history.length})`}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t('meeting_subtitle')}</p>
      </div>

      {/* Past meetings panel */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Past Meetings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {historyLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No past meetings saved yet.</p>
            ) : (
              <div className="space-y-1">
                {history.map((item) => (
                  <button
                    key={item.SK}
                    onClick={() => openPastMeeting(item)}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.meetingType} — {item.location}</p>
                      <p className="text-xs text-muted-foreground">{item.meetingDate} · {item.attendees} attendees</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => deletePastMeeting(item, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meeting metadata */}
      {!minutes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('meeting_details')}</CardTitle></CardHeader>
          <CardContent className="pt-0 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('date')}</label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('location')}</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('attendees')}</label>
              <input type="number" value={attendees} onChange={e => setAttendees(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('meeting_type')}</label>
              <select value={meetingType} onChange={e => setMeetingType(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option>Gram Sabha</option>
                <option>Special Gram Sabha</option>
                <option>Ward Meeting</option>
                <option>Committee Meeting</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recorder */}
      {!minutes && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-4">
            {recording && (
              <p className="text-xs text-muted-foreground">{meetingType} — {t('recording_in_progress')}</p>
            )}

            {processing ? (
              <>
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm font-medium">{t('processing_recording')}</p>
                <p className="text-xs text-muted-foreground">{t('transcribing_generating')}</p>
              </>
            ) : (
              <>
                {/* Spoken language selector */}
                {!recording && (
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
                )}
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={false}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${recording
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                >
                  {recording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {recording && (
                  <>
                    <p className="text-2xl font-mono font-bold">● {fmtTime(elapsed)}</p>
                    <div className="flex gap-1 items-end h-6">
                      {[3, 5, 4, 7, 3, 6, 4, 5, 3, 7, 5, 4].map((h, i) => (
                        <div key={i} className="w-1 bg-primary rounded-full animate-bounce"
                          style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }} />
                      ))}
                    </div>
                  </>
                )}

                {!recording && (
                  <p className="text-xs text-muted-foreground">{t('tap_to_start')}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript preview + retry */}
      {transcript && !minutes && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t('transcript')}</p>
              <p className="text-xs text-green-600 font-medium">✓ Transcript saved</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{transcript}</p>
            {!processing && (
              <Button size="sm" className="w-full gap-2" onClick={retryGenerate}>
                <ClipboardList size={14} /> Generate Minutes from Saved Transcript
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated minutes */}
      {minutes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('auto_generated_minutes')}</h2>
            <Badge variant="secondary">{t('ai_generated')}</Badge>
          </div>

          {/* Meeting details */}
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('meeting_details')}</CardTitle></CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('date')}</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.date || meetingDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('location')}</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.location || location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('attendees')}</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.attendees || attendees}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('meeting_type')}</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.type || meetingType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda */}
          {minutes.agenda_items?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('agenda_items')}</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {minutes.agenda_items.map((item, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0 text-muted-foreground/60">{i + 1}.</span> {typeof item === 'string' ? item : item.item || item.topic || JSON.stringify(item)}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Key Decisions */}
          {minutes.key_decisions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('key_decisions')}</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {minutes.key_decisions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{typeof d === 'string' ? d : d.decision || d.item || JSON.stringify(d)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {minutes.action_items?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('action_items')}</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                {minutes.action_items.map((a, i) => (
                  <div key={i} className="rounded-md border border-border p-3 space-y-0.5">
                    <p className="text-sm font-medium">{typeof a === 'string' ? a : a.task}</p>
                    {a.assigned && <p className="text-xs text-muted-foreground">{t('assigned_to')} {a.assigned}</p>}
                    {a.deadline && <p className="text-xs text-muted-foreground">{t('deadline')} {a.deadline}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Schemes discussed */}
          {minutes.schemes_discussed?.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('schemes_discussed')}</p>
                <div className="flex flex-wrap gap-2">
                  {minutes.schemes_discussed.map((s, i) => (
                    <Badge key={i} variant="secondary">{typeof s === 'string' ? s : s.name || s.scheme || JSON.stringify(s)}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Funds & Next meeting */}
          <div className="grid grid-cols-2 gap-3">
            {minutes.funds_approved && (
              <Card>
                <CardContent className="py-4 flex items-start gap-3">
                  <IndianRupee size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('funds_approved')}</p>
                    {Array.isArray(minutes.funds_approved)
                      ? minutes.funds_approved.map((f, i) => (
                          <p key={i} className="text-sm font-semibold">
                            {typeof f === 'string' ? f : [f.amount_inr, f.purpose, f.source].filter(Boolean).join(' — ')}
                          </p>
                        ))
                      : <p className="text-sm font-semibold mt-0.5">
                          {typeof minutes.funds_approved === 'string'
                            ? minutes.funds_approved
                            : [minutes.funds_approved.amount_inr, minutes.funds_approved.purpose, minutes.funds_approved.source].filter(Boolean).join(' — ')}
                        </p>
                    }
                  </div>
                </CardContent>
              </Card>
            )}
            {minutes.next_meeting && (
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <Calendar size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('next_meeting')}</p>
                    <p className="text-sm font-semibold mt-0.5">{minutes.next_meeting}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Hindi summary */}
          {minutes.summary_hindi && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{t('summary')}</p>
                <p className="text-sm leading-relaxed">{minutes.summary_hindi}</p>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {transcript && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{t('original_transcript')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">{transcript}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {savedId && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Saved to records (ID: {savedId.slice(0, 8)}…)
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => {
                setMinutes(null)
                setRawMinutes(null)
                setTranscript('')
                setElapsed(0)
                setSavedId(null)
              }}>
                <Mic size={14} /> {t('record_new')}
              </Button>
              <Button className="gap-2" onClick={downloadMinutes}>
                <Download size={14} /> {t('download_official_minutes')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
