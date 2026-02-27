import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Download, Edit2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const MOCK_MINUTES = {
  date: 'January 15, 2025',
  time: '10:00 AM – 12:30 PM',
  location: 'Panchayat Bhawan',
  attendees: '24 Members',
  agenda: [
    'Water supply improvement project approval',
    'Budget allocation for road construction',
    'MGNREGA work plan for Q1 2025',
    'School building repair proposal',
    'Grievance redressal status update',
  ],
  decisions: [
    'Approved ₹19 lakhs for water supply project under Jal Jeevan Mission',
    'Allocated ₹7.2 lakhs for village road construction from MGNREGA funds',
    'Formed committee to oversee school building repairs',
  ],
  actions: [
    { task: 'Submit water project proposal by Jan 25', assigned: 'Sarpanch & Secretary' },
    { task: 'Prepare MGNREGA work estimates', assigned: 'Technical Assistant' },
  ],
}

export default function MeetingMinutes() {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [generated, setGenerated] = useState(false)
  const [timerRef, setTimerRef] = useState(null)
  const navigate = useNavigate()

  const startRecording = () => {
    setRecording(true)
    setElapsed(0)
    const ref = setInterval(() => setElapsed(p => p + 1), 1000)
    setTimerRef(ref)
  }

  const stopRecording = () => {
    setRecording(false)
    clearInterval(timerRef)
    setTimeout(() => setGenerated(true), 1200)
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Meeting Minutes Generator</h1>
        <p className="text-sm text-muted-foreground">Record your Gram Sabha meeting and get auto-generated official minutes</p>
      </div>

      {/* Recorder */}
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-4">
          {recording && (
            <p className="text-xs text-muted-foreground">Gram Sabah Meeting — Recording in Progress</p>
          )}
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${
              recording
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {recording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {recording && (
            <>
              <p className="text-2xl font-mono font-bold">● {fmt(elapsed)}</p>
              <div className="flex gap-1 items-end h-6">
                {[3, 5, 4, 7, 3, 6, 4, 5, 3, 7, 5, 4].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-bounce"
                    style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            </>
          )}

          {!recording && !generated && (
            <Button onClick={startRecording} size="lg">
              <Mic size={16} /> Start Recording
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Generated minutes */}
      {generated && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Auto-Generated Summary</h2>

          <Card>
            <CardHeader><CardTitle className="text-sm">Meeting Details</CardTitle></CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium mt-0.5">{MOCK_MINUTES.date}</p></div>
              <div><p className="text-xs text-muted-foreground">Time</p><p className="font-medium mt-0.5">{MOCK_MINUTES.time}</p></div>
              <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium mt-0.5">{MOCK_MINUTES.location}</p></div>
              <div><p className="text-xs text-muted-foreground">Attendees</p><p className="font-medium mt-0.5">{MOCK_MINUTES.attendees}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Agenda Items Discussed</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-1">
              {MOCK_MINUTES.agenda.map((item, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="shrink-0 text-muted-foreground/60">{i + 1}.</span> {item}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Key Decisions</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {MOCK_MINUTES.decisions.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
                  <span className="text-muted-foreground">{d}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Action Items</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              {MOCK_MINUTES.actions.map((a, i) => (
                <div key={i} className="rounded-md border border-border p-3 space-y-0.5">
                  <p className="text-sm font-medium">{a.task}</p>
                  <p className="text-xs text-muted-foreground">Assigned to: {a.assigned}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Edit2 size={14} /> Edit Minutes
            </Button>
            <Button className="gap-2">
              <Download size={14} /> Download Official Minutes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
