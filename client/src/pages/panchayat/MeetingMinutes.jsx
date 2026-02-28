import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mic, MicOff, Download, CheckCircle2, Loader2,
  Calendar, MapPin, Users, ClipboardList, IndianRupee,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { exportMeetingMinutesPdf } from '@/utils/pdfExport'
import { useLanguage, TRANSCRIBE_LANGS } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export default function MeetingMinutes() {
  const navigate = useNavigate()
  const { language, getTranscribeLang, translateText, translateBatch } = useLanguage()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [minutes, setMinutes] = useState(null)
  const [transcript, setTranscript] = useState('')
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // ── Meeting metadata form ──
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('Panchayat Bhawan')
  const [attendees, setAttendees] = useState('24')
  const [meetingType, setMeetingType] = useState('Gram Sabha')

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

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
      toast.error('Microphone access denied')
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
      fd.append('language', getTranscribeLang())
      const transcribeRes = await axios.post(`${AI_BASE}/ai/voice/transcribe`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const text = transcribeRes.data.transcript || transcribeRes.data.text || ''
      if (!text) { toast.error('Could not transcribe audio'); setProcessing(false); return }
      setTranscript(text)

      // Step 2: Generate minutes from transcript
      const minutesRes = await axios.post(`${AI_BASE}/ai/meetings/generate-minutes`, {
        transcript: text,
        date: meetingDate,
        location,
        attendees: Number(attendees) || 0,
        meeting_type: meetingType,
      }, { timeout: 90000 })

      setMinutes(minutesRes.data)

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

      toast.success('Meeting minutes generated!')
    } catch (err) {
      toast.error('Failed to generate minutes')
    } finally {
      setProcessing(false)
    }
  }

  // ── Download as PDF ──
  const downloadMinutes = () => {
    if (!minutes) return
    exportMeetingMinutesPdf({ minutes, meetingDate, location, attendees, meetingType, transcript })
    toast.success('PDF downloaded')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Meeting Minutes Generator</h1>
          <LanguageSelector showCapabilities />
        </div>
        <p className="text-sm text-muted-foreground">Record your Gram Sabha meeting and get auto-generated official minutes</p>
      </div>

      {/* Meeting metadata */}
      {!minutes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Meeting Details</CardTitle></CardHeader>
          <CardContent className="pt-0 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Attendees</label>
              <input type="number" value={attendees} onChange={e => setAttendees(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Meeting Type</label>
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
              <p className="text-xs text-muted-foreground">{meetingType} — Recording in Progress</p>
            )}

            {processing ? (
              <>
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm font-medium">Processing recording…</p>
                <p className="text-xs text-muted-foreground">Transcribing audio → Generating minutes via AI</p>
              </>
            ) : (
              <>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!TRANSCRIBE_LANGS.has(language)}
                  title={!TRANSCRIBE_LANGS.has(language) ? 'Voice recording not supported for this language' : ''}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                    recording
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
                  <p className="text-xs text-muted-foreground">Tap to start recording your meeting</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript preview */}
      {transcript && !minutes && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {/* Generated minutes */}
      {minutes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Auto-Generated Minutes</h2>
            <Badge variant="secondary">AI Generated</Badge>
          </div>

          {/* Meeting details */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Meeting Details</CardTitle></CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.date || meetingDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.location || location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Attendees</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.attendees || attendees}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium mt-0.5">{minutes.meeting_details?.type || meetingType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda */}
          {minutes.agenda_items?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Agenda Items Discussed</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {minutes.agenda_items.map((item, i) => (
                  <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0 text-muted-foreground/60">{i + 1}.</span> {item}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Key Decisions */}
          {minutes.key_decisions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Key Decisions</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {minutes.key_decisions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{d}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {minutes.action_items?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Action Items</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                {minutes.action_items.map((a, i) => (
                  <div key={i} className="rounded-md border border-border p-3 space-y-0.5">
                    <p className="text-sm font-medium">{typeof a === 'string' ? a : a.task}</p>
                    {a.assigned && <p className="text-xs text-muted-foreground">Assigned to: {a.assigned}</p>}
                    {a.deadline && <p className="text-xs text-muted-foreground">Deadline: {a.deadline}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Schemes discussed */}
          {minutes.schemes_discussed?.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Schemes Discussed</p>
                <div className="flex flex-wrap gap-2">
                  {minutes.schemes_discussed.map((s, i) => (
                    <Badge key={i} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Funds & Next meeting */}
          <div className="grid grid-cols-2 gap-3">
            {minutes.funds_approved && (
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <IndianRupee size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Funds Approved</p>
                    <p className="text-sm font-semibold mt-0.5">{minutes.funds_approved}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {minutes.next_meeting && (
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <Calendar size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Meeting</p>
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
                <p className="text-xs font-semibold text-muted-foreground mb-1">सारांश / Summary</p>
                <p className="text-sm leading-relaxed">{minutes.summary_hindi}</p>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {transcript && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Original Transcript</p>
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">{transcript}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => {
              setMinutes(null)
              setTranscript('')
              setElapsed(0)
            }}>
              <Mic size={14} /> Record New
            </Button>
            <Button className="gap-2" onClick={downloadMinutes}>
              <Download size={14} /> Download Official Minutes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
