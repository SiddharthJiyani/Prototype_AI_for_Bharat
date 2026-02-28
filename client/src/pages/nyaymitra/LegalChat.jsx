import { useState, useRef, useEffect } from 'react'
import {
  Mic, MicOff, Send, Volume2, VolumeX, Loader2,
  Scale, Globe, Lightbulb, BookOpen, ArrowLeft,
  AlertTriangle, Plus, Search, ExternalLink, MessageSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import axios from 'axios'
import toast from 'react-hot-toast'

const MAX_CONTEXT_MESSAGES = 20

const LANGUAGES = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
]

const QUICK_QUESTIONS = [
  { label: 'मनरेगा मजदूरी', text: 'मनरेगा में मजदूरी नहीं मिली तो क्या करें?' },
  { label: 'RTI कैसे करें', text: 'RTI कैसे फाइल करें? पूरी प्रक्रिया बताएं।' },
  { label: 'जमीन का हक', text: 'मेरी जमीन पर कोई कब्जा कर रहा है, क्या करूं?' },
  { label: 'Free Legal Aid', text: 'मुझे मुफ्त कानूनी सहायता कैसे मिल सकती है?' },
  { label: 'Consumer Rights', text: 'दुकानदार ने खराब सामान बेचा, शिकायत कहां करें?' },
  { label: 'Domestic Violence', text: 'घरेलू हिंसा से बचाव के लिए कौन से कानून हैं?' },
]

export default function LegalChat() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [language, setLanguage] = useState('hi')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [contextWarning, setContextWarning] = useState(false)
  const [contextLimitReached, setContextLimitReached] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const chatEndRef = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const audioRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start a new chat — clear everything
  const startNewChat = () => {
    setMessages([])
    setContextWarning(false)
    setContextLimitReached(false)
    setInput('')
    toast.success('New chat started / नई चैट शुरू')
  }

  // Send text message
  const sendMessage = async (text = null) => {
    const question = text || input.trim()
    if (!question) return

    if (contextLimitReached) {
      toast.error('Context limit reached! Please start a new chat for better responses.')
      return
    }

    const userMsg = { role: 'user', content: question, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Send full conversation history for context continuity
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
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])

      // Handle context management feedback from backend
      const ctx = res.data.context_info
      if (ctx) {
        if (ctx.context_limit_reached) {
          setContextLimitReached(true)
        } else if (ctx.context_warning) {
          setContextWarning(true)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Could not get response. Please try again.')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', timestamp: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Voice recording
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
      toast('🎤 Recording... Speak now / बोलें...', { duration: 2000 })
    } catch (err) {
      toast.error('Microphone access denied')
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
    try {
      const res = await axios.post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const transcript = res.data.transcript || ''
      if (transcript) {
        setInput(transcript)
        toast.success('Voice recognized! / आवाज पहचानी गई!')
        sendMessage(transcript)
      } else {
        toast.error('Could not understand. Try again.')
      }
    } catch {
      toast.error('Voice transcription failed')
    } finally {
      setLoading(false)
    }
  }

  // Text-to-speech for AI responses
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
      toast.error('Text-to-speech unavailable')
      setSpeaking(false)
    }
  }

  const msgCount = messages.length
  const contextPercent = Math.min(100, Math.round((msgCount / MAX_CONTEXT_MESSAGES) * 100))

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-3xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/nyaymitra')} className="p-1 rounded-md hover:bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Scale size={14} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">NyayMitra Legal Chat</h1>
              <p className="text-[10px] text-muted-foreground">
                AI Legal Assistant
                {webSearchEnabled && <span className="ml-1 text-govgreen-500">• Web Search ON</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Web search toggle */}
          <button
            onClick={() => {
              setWebSearchEnabled(!webSearchEnabled)
              toast(webSearchEnabled ? 'Web search disabled' : 'Web search enabled — answers will include latest info')
            }}
            className={`p-1.5 rounded-md transition-colors ${
              webSearchEnabled ? 'bg-govgreen-100 dark:bg-govgreen-900/30 text-govgreen-600' : 'text-muted-foreground hover:bg-secondary'
            }`}
            title={webSearchEnabled ? 'Web search ON' : 'Web search OFF'}
          >
            <Search size={14} />
          </button>

          {/* New chat button */}
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
            title="New Chat"
          >
            <Plus size={14} />
          </button>

          {/* Language selector */}
          <div className="flex items-center gap-1">
            <Globe size={14} className="text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-none text-muted-foreground cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Context usage bar */}
      {msgCount > 0 && (
        <div className="px-4 py-1 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  contextLimitReached
                    ? 'bg-destructive'
                    : contextWarning
                    ? 'bg-saffron-500'
                    : 'bg-primary/50'
                }`}
                style={{ width: `${contextPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground min-w-[5ch] text-right">
              {msgCount}/{MAX_CONTEXT_MESSAGES}
            </span>
          </div>
        </div>
      )}

      {/* Context limit warning banner */}
      {contextWarning && !contextLimitReached && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-saffron-50 dark:bg-saffron-900/20 border border-saffron-200 dark:border-saffron-800/50 rounded-lg px-3 py-2 text-xs text-saffron-800 dark:text-saffron-300">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Context is getting long. Start a <button onClick={startNewChat} className="underline font-medium">new chat</button> soon for better responses.</span>
        </div>
      )}
      {contextLimitReached && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Context limit reached! Responses may be less accurate. <button onClick={startNewChat} className="underline font-medium">Start a new chat</button> for better results.</span>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scale size={28} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Welcome to NyayMitra / न्यायमित्र में स्वागत</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask any legal question in Hindi or English. You can also use voice.
                <br />
                कोई भी कानूनी सवाल पूछें — हिंदी या अंग्रेज़ी में। आवाज़ से भी पूछ सकते हैं।
              </p>
              {webSearchEnabled && (
                <p className="text-xs text-govgreen-600 dark:text-govgreen-400 flex items-center justify-center gap-1">
                  <Search size={11} /> Web search enabled — answers include latest legal updates
                </p>
              )}
            </div>

            {/* Quick question chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.text)}
                  className="px-3 py-1.5 rounded-full border border-border text-xs font-medium hover:bg-secondary hover:border-primary/30 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-secondary text-foreground rounded-bl-md'
              }`}
            >
              {/* Message content */}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {/* AI extras */}
              {msg.role === 'assistant' && (
                <div className="mt-3 space-y-3">
                  {/* Web enhanced badge */}
                  {msg.webEnhanced && (
                    <div className="flex items-center gap-1 text-[10px] text-govgreen-600 dark:text-govgreen-400">
                      <Search size={10} />
                      <span>Enhanced with web search results</span>
                    </div>
                  )}

                  {/* Laws cited */}
                  {msg.laws?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <BookOpen size={12} className="text-muted-foreground mt-0.5" />
                      {msg.laws.map((law, j) => (
                        <Badge key={j} variant="outline" className="text-[10px]">{law}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Action steps */}
                  {msg.steps?.length > 0 && (
                    <div className="space-y-1 border-t border-border/50 pt-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Steps to take:</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                        {msg.steps.map((step, j) => (
                          <li key={j}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Web sources */}
                  {msg.sources?.filter(s => s.type === 'web_search').length > 0 && (
                    <div className="border-t border-border/50 pt-2 space-y-1">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                        <ExternalLink size={10} /> Web Sources
                      </p>
                      {msg.sources.filter(s => s.type === 'web_search').slice(0, 3).map((s, j) => (
                        <a
                          key={j}
                          href={s.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[10px] text-primary hover:underline truncate"
                          title={s.title || s.source}
                        >
                          {s.title || s.source}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Needs lawyer warning */}
                  {msg.needsLawyer && (
                    <div className="flex items-center gap-1.5 bg-saffron-100 dark:bg-saffron-900/30 text-saffron-800 dark:text-saffron-300 text-xs rounded-lg px-3 py-2">
                      <Lightbulb size={14} />
                      <span>We recommend consulting a lawyer for this. Free legal aid: call 15100</span>
                    </div>
                  )}

                  {/* TTS button */}
                  <button
                    onClick={() => speakText(msg.content)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    {speaking ? 'Stop' : 'Listen / सुनें'}
                  </button>

                  {/* Follow-up questions */}
                  {msg.followUps?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                      {msg.followUps.map((q, j) => (
                        <button
                          key={j}
                          onClick={() => sendMessage(q)}
                          className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-card transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                {webSearchEnabled ? 'Searching & thinking... / खोज रहा हूं...' : 'Thinking... / सोच रहा हूं...'}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {/* Mic button */}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading || contextLimitReached}
            className={`p-2.5 rounded-full transition-colors shrink-0 ${
              recording
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {recording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={
                contextLimitReached
                  ? 'Context limit reached — start a new chat'
                  : language === 'hi'
                  ? 'अपना सवाल पूछें...'
                  : 'Ask your legal question...'
              }
              disabled={loading || contextLimitReached}
              className="w-full px-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-12"
            />
          </div>

          {/* Send / New Chat button */}
          {contextLimitReached ? (
            <Button onClick={startNewChat} size="icon" className="rounded-full shrink-0 bg-govgreen-600 hover:bg-govgreen-700">
              <Plus size={16} />
            </Button>
          ) : (
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-full shrink-0"
            >
              <Send size={16} />
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-2">
          NyayMitra provides legal information, not legal advice. Consult a lawyer for specific cases.
        </p>
      </div>
    </div>
  )
}
