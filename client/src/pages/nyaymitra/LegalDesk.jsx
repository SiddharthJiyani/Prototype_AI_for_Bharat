import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import {
  Upload, FileText, HelpCircle, Clock, TrendingUp,
  BookOpen, MessageSquare, Loader2, ArrowLeft, ChevronRight,
  History, Trash2, FolderOpen, Users, Scale, Shield,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, ExternalLink,
  ChevronDown, ChevronUp, Gavel, Lightbulb
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getUserId } from '@/utils/userId'

const TABS = [
  { id: 'summary', labelKey: 'ld_tab_summary', icon: FileText },
  { id: 'faq', labelKey: 'ld_tab_faq', icon: HelpCircle },
  { id: 'timeline', labelKey: 'ld_tab_timeline', icon: Clock },
  { id: 'predictive', labelKey: 'ld_tab_prediction', icon: TrendingUp },
  { id: 'caselaw', labelKey: 'ld_tab_caselaw', icon: BookOpen },
  { id: 'chat', labelKey: 'ld_tab_chat', icon: MessageSquare },
]

// ─── Collapsible action steps for doc-chat messages ─────────────────────────
function DocChatActionSteps({ steps }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-govgreen-50/50 dark:bg-govgreen-900/10 hover:bg-govgreen-50 dark:hover:bg-govgreen-900/20 transition-colors text-left"
      >
        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <Lightbulb size={12} className="text-govgreen-600 dark:text-govgreen-400" />
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-govgreen-100 dark:bg-govgreen-900/30 text-govgreen-700 dark:text-govgreen-400 text-[9px] font-bold">
            {steps.length}
          </span>
          {t('ld_rec_steps')}
        </span>
        {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 py-2.5 bg-card">
          <ol className="space-y-2">
            {steps.map((step, j) => (
              <li key={j} className="flex gap-2 text-[12px] text-foreground items-start">
                <span className="shrink-0 w-5 h-5 rounded-full bg-govgreen-100 dark:bg-govgreen-900/30 text-govgreen-700 dark:text-govgreen-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {j + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function LegalDesk() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const fileRef = useRef(null)
  const chatEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Document state
  const [documentText, setDocumentText] = useState('')
  const [fileName, setFileName] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [analyses, setAnalyses] = useState({})
  const [loading, setLoading] = useState({})
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatContextWarning, setChatContextWarning] = useState(false)
  const [chatContextLimitReached, setChatContextLimitReached] = useState(false)
  const [step, setStep] = useState(0) // 0 = upload/history, 1 = analysis

  // History state
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentDocId, setCurrentDocId] = useState(null)

  const userId = getUserId()

  // ─── Load history on mount ───
  useEffect(() => {
    loadHistory()
  }, [])

  // ─── Auto-scroll chat (scroll WITHIN the chat box, not the page) ───
  useEffect(() => {
    const el = chatContainerRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [chatMessages, chatLoading])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await axios.get(`/api/documents?userId=${userId}`)
      setHistory(res.data.documents || [])
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setHistoryLoading(false)
    }
  }

  // ─── Save / update document in DynamoDB ───
  const saveDocument = useCallback(async (docId, data = {}) => {
    try {
      if (docId) {
        // Update existing
        await axios.put(`/api/documents/${docId}`, {
          analyses: data.analyses,
          chatMessages: data.chatMessages,
        })
      } else {
        // Create new
        const res = await axios.post('/api/documents', {
          userId,
          fileName: data.fileName || fileName,
          documentText: data.documentText || documentText,
          analyses: data.analyses || analyses,
          chatMessages: data.chatMessages || chatMessages,
        })
        setCurrentDocId(res.data.docId)
        loadHistory() // Refresh sidebar
        return res.data.docId
      }
    } catch (err) {
      console.error('Save document error:', err)
    }
  }, [userId, fileName, documentText, analyses, chatMessages])

  // ─── Auto-save when analyses change ───
  useEffect(() => {
    if (!currentDocId || Object.keys(analyses).length === 0) return
    const timer = setTimeout(() => {
      saveDocument(currentDocId, { analyses, chatMessages })
    }, 1500) // Debounce 1.5s
    return () => clearTimeout(timer)
  }, [analyses, chatMessages, currentDocId])

  // ─── Load a document from history ───
  const loadFromHistory = async (docId) => {
    setLoading((prev) => ({ ...prev, history: true }))
    try {
      const res = await axios.get(`/api/documents/${docId}`)
      const doc = res.data
      setDocumentText(doc.documentText || '')
      setFileName(doc.fileName || 'Document')
      setAnalyses(doc.analyses || {})
      setChatMessages(doc.chatMessages || [])
      setCurrentDocId(doc.docId)
      setActiveTab('summary')
      setStep(1)
      toast.success(`${t('ld_doc_loaded')}: ${doc.fileName}`)
    } catch {
      toast.error(t('ld_doc_load_failed'))
    } finally {
      setLoading((prev) => ({ ...prev, history: false }))
    }
  }

  const deleteFromHistory = async (docId, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`/api/documents/${docId}`)
      setHistory((prev) => prev.filter((d) => d.docId !== docId))
      if (currentDocId === docId) {
        resetToUpload()
      }
      toast.success(t('ld_doc_deleted'))
    } catch {
      toast.error(t('ld_doc_delete_failed'))
    }
  }

  const resetToUpload = () => {
    setStep(0)
    setAnalyses({})
    setDocumentText('')
    setFileName('')
    setChatMessages([])
    setCurrentDocId(null)
    setChatInput('')
  }

  // ─── File upload handler ───
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase().split('.').pop()
    const supported = ['pdf', 'docx', 'doc', 'txt', 'md']
    if (!supported.includes(ext)) {
      toast.error(t('ld_unsupported_type'))
      return
    }

    setFileName(file.name)

    // Plain text files can be read directly
    if (['txt', 'md'].includes(ext)) {
      const text = await file.text()
      setDocumentText(text)
      setStep(1)
      setAnalyses({})
      setChatMessages([])
      toast.success(`${t('ld_doc_loaded')}: ${file.name}`)
      // Save to history and run summary
      const docId = await saveDocument(null, {
        fileName: file.name,
        documentText: text,
        analyses: {},
        chatMessages: [],
      })
      runAnalysis('summary', text, docId)
      return
    }

    // PDF / DOCX — upload to backend for parsing
    setLoading((prev) => ({ ...prev, upload: true }))
    toast(t('ld_extracting_toast'), { duration: 3000 })
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('analysis_type', 'summary')
      const res = await axios.post('/ai/rag/analyze-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.error) {
        toast.error(res.data.error)
        setLoading((prev) => ({ ...prev, upload: false }))
        return
      }

      const extractedText = res.data.extracted_text || ''
      const summaryData = { ...res.data }
      delete summaryData.extracted_text
      delete summaryData.filename
      delete summaryData.chunks_added

      setDocumentText(extractedText)
      setAnalyses({ summary: summaryData })
      setChatMessages([])
      setStep(1)
      toast.success(`${t('ld_doc_loaded')}: ${file.name} (${res.data.chunks_added} sections extracted)`)

      // Save to history
      await saveDocument(null, {
        fileName: file.name,
        documentText: extractedText,
        analyses: { summary: summaryData },
        chatMessages: [],
      })
    } catch (err) {
      console.error(err)
      toast.error(t('ld_process_failed'))
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }))
    }
  }

  const handlePaste = async () => {
    if (!documentText.trim()) {
      toast.error(t('ld_paste_error'))
      return
    }
    setFileName('Pasted Document')
    setAnalyses({})
    setChatMessages([])
    setStep(1)
    const docId = await saveDocument(null, {
      fileName: 'Pasted Document',
      documentText,
      analyses: {},
      chatMessages: [],
    })
    runAnalysis('summary', documentText, docId)
  }

  // ─── Run analysis for a tab ───
  const runAnalysis = async (type, text = null, docIdOverride = null) => {
    const doc = text || documentText
    if (!doc) return

    setLoading((prev) => ({ ...prev, [type]: true }))
    try {
      const res = await axios.post('/ai/rag/analyze', {
        text: doc,
        analysis_type: type,
      })
      setAnalyses((prev) => {
        const updated = { ...prev, [type]: res.data }
        // Auto-save with latest analyses
        const dId = docIdOverride || currentDocId
        if (dId) {
          saveDocument(dId, { analyses: updated, chatMessages })
        }
        return updated
      })
    } catch (err) {
      console.error(err)
      toast.error(`${t('ld_analysis_failed')}: ${type}`)
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    if (!analyses[tabId] && tabId !== 'chat') {
      runAnalysis(tabId)
    }
  }

  // ─── Document chat ───
  const clearDocChat = () => {
    setChatMessages([])
    setChatContextWarning(false)
    setChatContextLimitReached(false)
    setChatInput('')
    toast.success(t('ld_chat_cleared'))
  }

  const sendChatMessage = async (overrideText) => {
    const q = (typeof overrideText === 'string' ? overrideText : chatInput).trim()
    if (!q) return

    if (chatContextLimitReached) {
      toast.error(t('ld_context_limit_error'))
      return
    }

    const newUserMsg = { role: 'user', content: q }
    const updatedMessages = [...chatMessages, newUserMsg]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await axios.post('/ai/rag/doc-chat', {
        question: q,
        document_text: documentText,
        language: 'en',
        chat_history: updatedMessages.map(m => ({ role: m.role, content: m.content })),
      })

      console.log('━━━ [LegalDesk] Doc-Chat Response ━━━')
      console.log('Question:', q)
      console.log('Full response:', JSON.parse(JSON.stringify(res.data)))
      console.log('Answer:', res.data.answer?.substring(0, 200) + '...')
      console.log('Laws cited:', res.data.laws_cited)
      console.log('Actions:', res.data.action_steps)
      console.log('Follow-ups:', res.data.follow_up_questions)
      console.log('Context info:', res.data.context_info)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const newAssistantMsg = {
        role: 'assistant',
        content: res.data.answer,
        laws: res.data.laws_cited || [],
        steps: res.data.action_steps || [],
        needsLawyer: res.data.needs_lawyer || false,
        followUps: res.data.follow_up_questions || [],
      }
      const allMessages = [...updatedMessages, newAssistantMsg]
      setChatMessages(allMessages)

      // Handle context feedback
      const ctx = res.data.context_info
      if (ctx) {
        if (ctx.context_limit_reached) setChatContextLimitReached(true)
        else if (ctx.context_warning) setChatContextWarning(true)
      }

      // Auto-save chat
      if (currentDocId) {
        saveDocument(currentDocId, { analyses, chatMessages: allMessages })
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, could not process your question.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // ─── Format relative time ───
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('ld_just_now')
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  // ═══════════════════════════════════════════════
  //  Step 0: Upload + Recent Documents
  // ═══════════════════════════════════════════════
  if (step === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/nyaymitra')} className="p-1 rounded-md hover:bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">NyayMitra</p>
            <h1 className="text-xl font-semibold">{t('ld_title')}</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('ld_subtitle')}
        </p>

        {/* Upload area */}
        <Card>
          <CardContent className="p-8">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">{t('ld_upload_click')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('ld_upload_supported')}</p>
              {loading.upload && (
                <div className="flex items-center gap-2 justify-center mt-2 text-xs text-primary">
                  <Loader2 size={14} className="animate-spin" /> {t('ld_extracting')}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Or paste text */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t('ld_or_paste')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder={t('ld_paste_placeholder')}
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />

          <Button onClick={handlePaste} disabled={!documentText.trim()} className="w-full" size="lg">
            {t('ld_analyze_btn')} <ChevronRight size={16} />
          </Button>
        </div>

        {/* ─── Recent Documents ─── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <History size={15} /> {t('ld_recent_docs')}
            </h2>
            <button onClick={loadHistory} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw size={11} /> {t('ld_refresh')}
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" />
              <p className="text-xs">{t('ld_loading_history')}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <FolderOpen size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">{t('ld_no_docs')}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {history.map((doc) => (
                <div
                  key={doc.docId}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadFromHistory(doc.docId)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadFromHistory(doc.docId) }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-colors text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(doc.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteFromHistory(doc.docId, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  //  Step 1: Analysis Dashboard
  // ═══════════════════════════════════════════════
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={resetToUpload} className="p-1 rounded-md hover:bg-secondary">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{t('ld_analysis_header')}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText size={11} /> {fileName}
              {currentDocId && (
                <span className="text-[10px] bg-govgreen-100 dark:bg-govgreen-900/30 text-govgreen-700 dark:text-govgreen-400 px-1.5 py-0.5 rounded ml-1">
                  {t('ld_saved')}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToUpload}>
            <Upload size={14} /> {t('ld_new')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-secondary text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon size={13} />
              <span>{t(tab.labelKey)}</span>
              {analyses[tab.id] && <span className="w-1.5 h-1.5 rounded-full bg-govgreen-500" />}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[50vh]">
        {loading[activeTab] ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">{t('ld_analyzing')}</p>
          </div>
        ) : activeTab === 'chat' ? (
          /* ─── Chat Tab ─── */
          <div className="space-y-4">
            <div ref={chatContainerRef} className="border border-border rounded-lg bg-card p-4 h-[65vh] overflow-y-auto space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <MessageSquare size={28} className="mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {t('ld_chat_empty')}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[t('ld_quick_q1'), t('ld_quick_q2'), t('ld_quick_q3'), t('ld_quick_q4')].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendChatMessage(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}>
                    {msg.role === 'user' ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : (
                      <>

                        {/* Main answer */}
                        <MarkdownRenderer content={msg.content} />

                        {/* ─── Structured metadata cards ─── */}
                        <div className="mt-3 space-y-2">

                          {/* Action Steps */}
                          {msg.steps?.length > 0 && (
                            <DocChatActionSteps steps={msg.steps} />
                          )}

                          {/* Laws cited as source pills */}
                          {msg.laws?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
                              <BookOpen size={11} className="text-primary/70 shrink-0" />
                              {msg.laws.map((law, j) => (
                                <span key={j} className="inline-flex items-center text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {law}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Follow-up suggestions */}
                          {msg.followUps?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                              {msg.followUps.map((q, j) => (
                                <button
                                  key={j}
                                  onClick={() => setChatInput(q)}
                                  className="text-[10px] px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Document Section source tag */}
                          {/* <div className="border-t border-border/40 pt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary cursor-default">
                              <FileText size={10} /> Document Section
                            </span>
                          </div> */}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> {t('ld_chat_thinking')}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Context limit warning */}
            {chatContextWarning && !chatContextLimitReached && (
              <div className="flex items-center gap-2 text-xs bg-saffron-50 dark:bg-saffron-900/20 border border-saffron-200 dark:border-saffron-800/50 rounded-lg px-3 py-2 text-saffron-800 dark:text-saffron-300">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{t('ld_context_warning')} <button onClick={clearDocChat} className="underline font-medium">{t('ld_chat_clear')}</button></span>
              </div>
            )}
            {chatContextLimitReached && (
              <div className="flex items-center gap-2 text-xs bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-destructive">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{t('ld_context_limit')} <button onClick={clearDocChat} className="underline font-medium">{t('ld_chat_clear')}</button></span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder={chatContextLimitReached ? t('ld_chat_placeholder_limit') : t('ld_chat_placeholder')}
                disabled={chatContextLimitReached}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {chatMessages.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearDocChat} title="Clear chat">
                  <RefreshCw size={14} />
                </Button>
              )}
              <Button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim() || chatContextLimitReached}>
                <MessageSquare size={14} /> {t('ld_chat_ask')}
              </Button>
            </div>
          </div>
        ) : analyses[activeTab] ? (
          /* ─── Render analysis results ─── */
          <AnalysisResult type={activeTab} data={analyses[activeTab]} />
        ) : (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-sm">{t('ld_run_analysis')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => runAnalysis(activeTab)}>
              {t('ld_run_btn')} {t(TABS.find((t2) => t2.id === activeTab)?.labelKey || '')}
            </Button>
          </div>
        )}
      </div>

      {/* Re-run analysis button */}
      {analyses[activeTab] && activeTab !== 'chat' && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => runAnalysis(activeTab)}
            disabled={loading[activeTab]}
            className="text-xs text-muted-foreground"
          >
            <RefreshCw size={12} /> {t('ld_rerun')}
          </Button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
//  Analysis Result Renderer
// ═══════════════════════════════════════════════
function AnalysisResult({ type, data }) {
  if (data.error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={24} className="mx-auto text-destructive mb-2" />
        <p className="text-destructive text-sm">{data.error}</p>
        {data.raw && <p className="text-xs text-muted-foreground mt-2 max-w-lg mx-auto">{data.raw}</p>}
      </div>
    )
  }

  switch (type) {
    case 'summary':
      return <SummaryView data={data} />
    case 'faq':
      return <FAQView data={data} />
    case 'timeline':
      return <TimelineView data={data} />
    case 'predictive':
      return <PredictiveView data={data} />
    case 'caselaw':
      return <CaseLawView data={data} />
    default:
      return <p className="text-muted-foreground text-sm py-8 text-center">No data available</p>
  }
}

// ─── Summary Tab ───
function SummaryView({ data }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText size={14} className="text-primary" /> {t('ld_summary_label')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{data.summary}</p>
          </div>

          {/* Parties info */}
          {data.parties && (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Users size={12} /> {t('ld_parties_title')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {data.parties.petitioner && (
                  <div>
                    <span className="text-xs text-muted-foreground">{t('ld_petitioner')}:</span>
                    <p className="font-medium">{data.parties.petitioner}</p>
                  </div>
                )}
                {data.parties.respondent && (
                  <div>
                    <span className="text-xs text-muted-foreground">{t('ld_respondent')}:</span>
                    <p className="font-medium">{data.parties.respondent}</p>
                  </div>
                )}
                {data.parties.court && (
                  <div>
                    <span className="text-xs text-muted-foreground">{t('ld_court')}:</span>
                    <p className="font-medium">{data.parties.court}</p>
                  </div>
                )}
                {data.parties.case_number && (
                  <div>
                    <span className="text-xs text-muted-foreground">{t('ld_case_no')}:</span>
                    <p className="font-medium">{data.parties.case_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Key Points */}
          {data.key_points?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t('ld_key_points')}</h4>
              <ul className="space-y-2">
                {data.key_points.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Required */}
          {data.action_required && (
            <div className="bg-saffron-50 dark:bg-saffron-900/20 border border-saffron-200 dark:border-saffron-800/50 rounded-lg p-3">
              <p className="text-sm font-medium text-saffron-800 dark:text-saffron-300">
                ⚠️ {t('ld_action_required')}: {data.action_required}
              </p>
              {data.deadline && (
                <p className="text-xs text-saffron-600 dark:text-saffron-400 mt-1">
                  <Clock size={11} className="inline mr-1" />
                  {t('ld_deadline')}: {data.deadline}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── FAQ Tab ───
function FAQView({ data }) {
  const { t } = useLanguage()
  const faqs = data.faqs || []
  if (faqs.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">{t('ld_no_faqs')}</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{faqs.length} {t('ld_faq_count')}</p>
      {faqs.map((faq, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  <HelpCircle size={12} className="inline mr-1 text-primary" />
                  {faq.question}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Timeline Tab ───
function TimelineView({ data }) {
  const { t } = useLanguage()
  const events = data.events || []
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">{t('ld_no_timeline')}</p>
  }

  const importanceColors = {
    high: 'bg-destructive',
    medium: 'bg-saffron-500',
    low: 'bg-muted-foreground/50',
  }
  const importanceBadge = {
    high: 'destructive',
    medium: 'warning',
    low: 'muted',
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-3">{events.length} {t('ld_timeline_count')}</p>
      {events.map((event, i) => (
        <div key={i} className="flex gap-3 pb-1">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${importanceColors[event.importance] || importanceColors.low}`} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-xs font-semibold text-primary">{event.date}</p>
            <p className="text-sm mt-0.5">{event.event}</p>
            <Badge variant={importanceBadge[event.importance] || 'muted'} className="mt-1 text-[10px]">
              {event.importance}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Predictive Analysis Tab ───
function PredictiveView({ data }) {
  const { t } = useLanguage()
  const confidenceColor = {
    high: 'success',
    medium: 'warning',
    low: 'destructive',
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="text-sm font-semibold">{t('ld_predictive_title')}</h3>
            <Badge variant={confidenceColor[data.confidence] || 'muted'}>
              {data.confidence} {t('ld_confidence')}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t('ld_likely_outcome')}</p>
            <p className="text-sm leading-relaxed">{data.prediction}</p>
          </div>

          {data.timeline && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Clock size={11} /> {t('ld_est_timeline')}
              </p>
              <p className="text-sm">{data.timeline}</p>
            </div>
          )}

          {data.strategy && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Scale size={11} /> {t('ld_rec_strategy')}
              </p>
              <p className="text-sm leading-relaxed">{data.strategy}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.strengths?.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-govgreen-600 dark:text-govgreen-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> {t('ld_strengths')}
              </h4>
              <ul className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-govgreen-500 mt-0.5">+</span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.weaknesses?.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-destructive flex items-center gap-1.5">
                <XCircle size={13} /> {t('ld_weaknesses')}
              </h4>
              <ul className="space-y-1.5">
                {data.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-destructive mt-0.5">-</span>
                    <span className="text-muted-foreground">{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Risks */}
      {data.risks?.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase text-saffron-600 dark:text-saffron-400 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {t('ld_risks')}
            </h4>
            <ul className="space-y-1.5">
              {data.risks.map((r, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-saffron-500 mt-1 shrink-0">•</span>
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Case Law Tab ───
function CaseLawView({ data }) {
  const { t } = useLanguage()
  const cases = data.cases || []
  const acts = data.acts || []

  if (cases.length === 0 && acts.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">{t('ld_no_caselaw')}</p>
  }

  return (
    <div className="space-y-5">
      {/* Cases */}
      {cases.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BookOpen size={14} className="text-primary" /> {t('ld_relevant_cases')} ({cases.length})
          </h3>
          {cases.map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{c.name}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{i + 1}</Badge>
                </div>
                {c.citation && <p className="text-xs text-primary font-mono">{c.citation}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed">{c.relevance}</p>
                {c.outcome && (
                  <div className="bg-secondary/50 rounded px-2.5 py-1.5 text-xs">
                    <span className="font-medium">{t('ld_outcome')}: </span>
                    <span className="text-muted-foreground">{c.outcome}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Acts & Sections */}
      {acts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield size={14} className="text-primary" /> {t('ld_acts_sections')} ({acts.length})
          </h3>
          {acts.map((a, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium">{a.name}</p>
                {a.sections?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.sections.map((s, j) => (
                      <Badge key={j} variant="outline" className="text-[10px] font-mono">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">{a.relevance}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
