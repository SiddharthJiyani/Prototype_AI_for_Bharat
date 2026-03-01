import { useState, useRef, useEffect } from 'react'
import {
  Mic, MicOff, Send, Volume2, VolumeX, Loader2,
  Scale, Globe, Lightbulb, BookOpen, ArrowLeft,
  AlertTriangle, Plus, Search, ExternalLink, MessageSquare,
  ChevronDown, ChevronUp, Gavel, Link2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useLanguage, LANGUAGES } from '@/context/LanguageContext'

const MAX_CONTEXT_MESSAGES = 20



const QUICK_QUESTIONS = [
  { label: 'मनरेगा मजदूरी', text: 'मनरेगा में मजदूरी नहीं मिली तो क्या करें?' },
  { label: 'RTI कैसे करें', text: 'RTI कैसे फाइल करें? पूरी प्रक्रिया बताएं।' },
  { label: 'जमीन का हक', text: 'मेरी जमीन पर कोई कब्जा कर रहा है, क्या करूं?' },
  { label: 'Free Legal Aid', text: 'मुझे मुफ्त कानूनी सहायता कैसे मिल सकती है?' },
  { label: 'Consumer Rights', text: 'दुकानदार ने खराब सामान बेचा, शिकायत कहां करें?' },
  { label: 'Domestic Violence', text: 'घरेलू हिंसा से बचाव के लिए कौन से कानून हैं?' },
]

// ─── Source pill component ───────────────────────────────────────────────────
function SourcePill({ source, index }) {
  const isKanoon = source.type === 'indian_kanoon'
  return (
    <a
      href={source.source}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border
        transition-all duration-150 max-w-[240px]
        ${isKanoon
          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40'
          : 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40'
        }
      `}
      title={`${source.title || source.source}${source.court ? ` — ${source.court}` : ''}`}
    >
      <span className="shrink-0 opacity-70">
        {isKanoon
          ? <Gavel size={10} />
          : <ExternalLink size={10} />
        }
      </span>
      <span className="truncate leading-tight">{source.title || source.source}</span>
      {source.court && (
        <span className="shrink-0 opacity-50 text-[9px]">· {source.court}</span>
      )}
    </a>
  )
}

// ─── Law badge component ─────────────────────────────────────────────────────
function LawBadge({ law }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-300">
      <BookOpen size={9} className="shrink-0 opacity-70" />
      {law}
    </span>
  )
}

// ─── AI Message card ─────────────────────────────────────────────────────────
function AIMessage({ msg, onSpeak, speaking }) {
  const [showSteps, setShowSteps] = useState(false)
  const kanoon = msg.sources?.filter(s => s.type === 'indian_kanoon').slice(0, 3) || []
  const web = msg.sources?.filter(s => s.type === 'web_search').slice(0, 2) || []
  const hasSources = kanoon.length > 0 || web.length > 0
  const hasLaws = msg.laws?.length > 0
  const hasSteps = msg.steps?.length > 0
  const hasFollowUps = msg.followUps?.length > 0

  return (
    <div className="flex justify-start">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5">
        <Scale size={13} className="text-primary" />
      </div>

      <div className="max-w-[85%] space-y-2">
        {/* Main answer bubble */}
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="text-sm leading-relaxed">
            <MarkdownRenderer content={msg.content} />
          </div>

          {/* Confidence / badges row */}
          {(msg.webEnhanced || msg.agentTrace) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-border/50">
              {msg.webEnhanced && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50">
                  <Search size={9} /> Web Enhanced
                </span>
              )}
              {msg.agentTrace?.query_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                  {msg.agentTrace.query_type}
                </span>
              )}
              {msg.agentTrace?.confidence && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${msg.agentTrace.confidence === 'high'
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                  : msg.agentTrace.confidence === 'medium'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                  }`}>
                  {msg.agentTrace.confidence} confidence
                </span>
              )}
            </div>
          )}
        </div>

        {/* Laws cited — standalone card */}
        {hasLaws && (
          <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
              <BookOpen size={10} /> Laws &amp; Sections Cited
            </p>
            <div className="flex flex-wrap gap-1.5">
              {msg.laws.map((law, j) => (
                <LawBadge key={j} law={law} />
              ))}
            </div>
          </div>
        )}

        {/* Action steps — collapsible */}
        {hasSteps && (
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-secondary/50 hover:bg-secondary transition-colors text-left"
            >
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                  {msg.steps.length}
                </span>
                Steps to Take
              </span>
              {showSteps ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
            </button>
            {showSteps && (
              <div className="px-3.5 py-2.5 bg-card">
                <ol className="space-y-2">
                  {msg.steps.map((step, j) => (
                    <li key={j} className="flex gap-2.5 text-[12px] text-foreground">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {j + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Sources — clearly split by type */}
        {hasSources && (
          <div className="border border-border rounded-xl px-3.5 py-2.5 bg-card">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Link2 size={10} /> References
            </p>
            <div className="space-y-2">
              {kanoon.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold mb-1.5">
                    Case Law · Indian Kanoon
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {kanoon.map((s, j) => <SourcePill key={j} source={s} index={j} />)}
                  </div>
                </div>
              )}
              {web.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-1.5">
                    Web Sources
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {web.map((s, j) => <SourcePill key={j} source={s} index={j} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Needs lawyer warning */}
        {msg.needsLawyer && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3.5 py-2.5">
            <Lightbulb size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Professional Legal Help Recommended</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                This situation may benefit from a qualified lawyer. Free legal aid available — call <strong>15100</strong>
              </p>
            </div>
          </div>
        )}

        {/* Bottom row: TTS + follow-ups */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSpeak(msg.content)}
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${speaking
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
          >
            {speaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
            {speaking ? 'Stop' : 'Listen / सुनें'}
          </button>

          {hasFollowUps && msg.followUps.map((q, j) => (
            <button
              key={j}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Timestamp */}
        {msg.timestamp && (
          <p className="text-[9px] text-muted-foreground/50 pl-1">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── User message ─────────────────────────────────────────────────────────────
function UserMessage({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%]">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {msg.timestamp && (
          <p className="text-[9px] text-muted-foreground/50 text-right mt-1 pr-1">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LegalChat() {
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [contextWarning, setContextWarning] = useState(false)
  const [contextLimitReached, setContextLimitReached] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [spokenLang, setSpokenLang] = useState('hi')
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const audioRef = useRef(null)

  useEffect(() => {
    const el = chatContainerRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages, loading])

  const startNewChat = () => {
    setMessages([])
    setContextWarning(false)
    setContextLimitReached(false)
    setInput('')
    toast.success(t('new_chat_started'))
  }

  const sendMessage = async (text = null) => {
    const question = text || input.trim()
    if (!question) return

    if (contextLimitReached) {
      toast.error(t('context_limit_toast'))
      return
    }

    const userMsg = { role: 'user', content: question, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await axios.post('/ai/rag/chat', {
        question,
        language,
        chat_history: chatHistory,
        enable_web_search: webSearchEnabled,
      })

      const aiMsg = {
        role: 'assistant',
        content: res.data.answer,
        laws: res.data.laws_cited || [],
        steps: res.data.action_steps || [],
        needsLawyer: res.data.needs_lawyer,
        followUps: res.data.follow_up_questions || [],
        sources: res.data.sources || [],
        webEnhanced: res.data.web_enhanced || false,
        agentTrace: res.data.agent_trace || null,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])

      const ctx = res.data.context_info
      if (ctx) {
        if (ctx.context_limit_reached) setContextLimitReached(true)
        else if (ctx.context_warning) setContextWarning(true)
      }
    } catch (err) {
      console.error(err)
      toast.error(t('response_failed'))
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('response_failed'), timestamp: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      audioChunks.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await transcribeAudio(blob)
      }
      mr.start()
      mediaRecorder.current = mr
      setRecording(true)
      toast(`🎤 ${t('recording_started')}`, { duration: 2000 })
    } catch (err) {
      toast.error(t('mic_denied'))
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }

  const transcribeAudio = async (blob) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('language', spokenLang)
    try {
      const res = await axios.post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const transcript = res.data.transcript || ''
      if (transcript) {
        setInput(transcript)
        toast.success(t('voice_recognized'))
        sendMessage(transcript)
      } else {
        toast.error(t('could_not_understand'))
      }
    } catch {
      toast.error(t('voice_transcription_failed'))
    } finally {
      setLoading(false)
    }
  }

  const speakText = async (text) => {
    if (speaking) {
      if (audioRef.current) audioRef.current.pause()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    try {
      const res = await axios.post('/ai/tts/speak', { text, language }, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.play()
    } catch {
      toast.error(t('tts_unavailable'))
      setSpeaking(false)
    }
  }

  const msgCount = messages.length
  const contextPercent = Math.min(100, Math.round((msgCount / MAX_CONTEXT_MESSAGES) * 100))

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-5xl mx-auto w-full px-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/nyaymitra')} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Scale size={14} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">{t('legal_assistant')}</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                AI {t('legal_assistant')}
                {webSearchEnabled && <span className="ml-1 text-green-600 dark:text-green-400">· {t('web_search_on')}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Web search toggle */}
          <button
            onClick={() => {
              setWebSearchEnabled(!webSearchEnabled)
              toast(webSearchEnabled ? t('web_search_disabled') : t('web_search_enabled'))
            }}
            className={`p-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 ${webSearchEnabled
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50'
              : 'text-muted-foreground hover:bg-secondary border border-transparent'
              }`}
            title={webSearchEnabled ? 'Disable web search' : 'Enable web search'}
          >
            <Search size={13} />
          </button>

          {/* New chat */}
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-transparent"
            title="New Chat"
          >
            <Plus size={13} />
          </button>

          {/* Language selector */}
          <div className="flex items-center gap-1 pl-1 border-l border-border">
            <Globe size={12} className="text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-none text-muted-foreground cursor-pointer pr-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Context bar ── */}
      {msgCount > 0 && (
        <div className="px-4 py-1.5 bg-card border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${contextLimitReached ? 'bg-destructive' : contextWarning ? 'bg-amber-500' : 'bg-primary/40'
                  }`}
                style={{ width: `${contextPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono min-w-[5ch] text-right">
              {msgCount}/{MAX_CONTEXT_MESSAGES}
            </span>
          </div>
        </div>
      )}

      {/* ── Warning banners ── */}
      {contextWarning && !contextLimitReached && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{t('context_warning_msg')} <button onClick={startNewChat} className="underline font-semibold">{t('start_new_chat')}</button></span>
        </div>
      )}
      {contextLimitReached && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{t('context_limit_msg')} <button onClick={startNewChat} className="underline font-semibold">{t('start_new_chat')}</button></span>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Welcome screen */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scale size={28} className="text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">{t('legal_assistant')}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('chat_subtitle')}
              </p>
              {webSearchEnabled && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1 pt-1">
                  <Search size={11} /> {t('web_search_on')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.text)}
                  className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:bg-secondary hover:border-primary/30 transition-colors shadow-sm"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) =>
          msg.role === 'user'
            ? <UserMessage key={i} msg={msg} />
            : <AIMessage key={i} msg={msg} onSpeak={speakText} speaking={speaking} />
        )}

        {/* Loading bubble */}
        {loading && (
          <div className="flex justify-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2">
              <Scale size={13} className="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                {webSearchEnabled ? t('chat_searching') : t('chat_thinking')}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Spoken language selector */}
          <select
            value={spokenLang}
            onChange={(e) => setSpokenLang(e.target.value)}
            className="text-xs bg-secondary border border-border rounded-md px-1.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
            title={t('spoken_language') || 'Spoken language'}
          >
            <option value="hi">हि</option>
            <option value="en">En</option>
            <option value="mr">मर</option>
            <option value="ta">தம</option>
            <option value="te">తె</option>
          </select>
          {/* Mic */}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || contextLimitReached}
            className={`p-2.5 rounded-full transition-colors shrink-0 ${recording
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
          >
            {recording ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={
              contextLimitReached
                ? t('context_limit_msg')
                : t('type_legal_question')
            }
            disabled={loading || contextLimitReached}
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />

          {/* Send / New */}
          {contextLimitReached ? (
            <button
              onClick={startNewChat}
              className="p-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors shrink-0"
            >
              <Plus size={16} />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-2">
          {t('ai_assistant_general')}
        </p>
      </div>
    </div>
  )
}