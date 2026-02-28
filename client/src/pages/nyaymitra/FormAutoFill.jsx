import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, FileText, Loader2, Sparkles,
  Download, ChevronLeft, ChevronRight, HelpCircle, Send,
  CheckCircle2, AlertCircle, Wand2, RotateCcw
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import pdfjsWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

// ── Bbox normalizer — supports multiple formats from backend ──
const normalizeBbox = (bbox) => {
  if (!bbox) return null
  if (Array.isArray(bbox) && bbox.length === 4) {
    const [a, b, c, d] = bbox.map(n => Number(n) || 0)
    if (c > a && d > b) return { x: a, y: b, w: c - a, h: d - b }
    return { x: a, y: b, w: c, h: d }
  }
  if (bbox.xmin !== undefined) return { x: bbox.xmin, y: bbox.ymin, w: bbox.xmax - bbox.xmin, h: bbox.ymax - bbox.ymin }
  if (bbox.x !== undefined && bbox.w !== undefined) return { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h }
  if (bbox.left !== undefined) return { x: bbox.left, y: bbox.top, w: bbox.width, h: bbox.height }
  return null
}

const looksNormalizedFraction = (b) => {
  if (!b) return false
  const vals = [b.x, b.y, b.w, b.h].map(v => Number(v))
  if (vals.some(v => Number.isNaN(v))) return false
  return vals.every(v => v >= 0 && v <= 1)
}

export default function FormAutoFill() {
  const navigate = useNavigate()

  // ── State ──
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  const [fields, setFields] = useState([])
  const [selectedField, setSelectedField] = useState(null)
  const [fieldValues, setFieldValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en')
  const [formId, setFormId] = useState(null)

  // PDF
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 })
  const [pdfRenderError, setPdfRenderError] = useState(null)

  // AI
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')

  // Refs
  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const pdfCanvasRef = useRef(null)
  const pdfRef = useRef(null)
  const pdfUrlRef = useRef(null)

  // Cleanup
  useEffect(() => {
    return () => {
      if (imageUrl) try { URL.revokeObjectURL(imageUrl) } catch {}
    }
  }, [imageUrl])

  useEffect(() => {
    return () => {
      try { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current) } catch {}
      try { if (pdfRef.current?.destroy) pdfRef.current.destroy() } catch {}
    }
  }, [])

  // ── File upload ──
  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setImageUrl(url)
    const pdfCheck = f.type === 'application/pdf' || f.name?.toLowerCase().endsWith('.pdf')
    setIsPdf(pdfCheck)
    setFields([])
    setSelectedField(null)
    setFieldValues({})
    setFormId(null)
    setAiResponse('')
    setSuggestions([])

    if (pdfCheck) {
      renderPdfToCanvas(f, 1)
    }
  }

  // ── PDF rendering (adapted from Legal_SahAI_repo — working approach) ──
  const renderPdfToCanvas = async (pdfFile, startPage = 1) => {
    setPdfRenderError(null)
    let pdfjs = null

    // Try legacy build first, then standard build
    try {
      pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    } catch {
      try {
        pdfjs = await import('pdfjs-dist')
      } catch (e2) {
        console.error('pdfjs import failed', e2)
        setPdfRenderError('Failed to load PDF library')
        return
      }
    }

    try {
      // Point worker to local file bundled by Vite
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl
      }

      const url = URL.createObjectURL(pdfFile)
      if (pdfUrlRef.current) {
        try { URL.revokeObjectURL(pdfUrlRef.current) } catch {}
      }
      pdfUrlRef.current = url

      const loadingTask = pdfjs.getDocument(url)
      const pdf = await loadingTask.promise
      pdfRef.current = pdf
      setTotalPages(pdf.numPages || 1)

      const page = await pdf.getPage(startPage)
      const viewport = page.getViewport({ scale: 1 })
      const canvas = pdfCanvasRef.current
      if (!canvas) { setPdfRenderError('No canvas element'); return }

      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      canvas.style.width = '100%'
      canvas.style.height = 'auto'

      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise

      setNaturalSize({ w: viewport.width, h: viewport.height })
      setCurrentPage(startPage)
    } catch (err) {
      console.error('PDF render failed', err)
      setPdfRenderError(`PDF render failed: ${err.message}`)
    }
  }

  const renderPage = async (pageNum) => {
    try {
      if (!pdfRef.current) return
      const page = await pdfRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      const canvas = pdfCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      canvas.style.width = '100%'
      canvas.style.height = 'auto'
      await page.render({ canvasContext: ctx, viewport }).promise
      setNaturalSize({ w: viewport.width, h: viewport.height })
      setCurrentPage(pageNum)
    } catch (err) {
      console.error('renderPage failed', err)
    }
  }

  // ── Image onLoad ──
  const onImageLoad = (e) => {
    setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })
  }

  // ── Scale bbox from natural coords to display coords ──
  const scaleBbox = (bbox) => {
    if (!bbox) return null
    const el = isPdf ? pdfCanvasRef.current : imgRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const scaleX = rect.width / Math.max(1, naturalSize.w)
    const scaleY = rect.height / Math.max(1, naturalSize.h)

    const offsetLeft = containerRect ? rect.left - containerRect.left : 0
    const offsetTop = containerRect ? rect.top - containerRect.top : 0

    let left = Math.round(offsetLeft + bbox.x * scaleX)
    let top = Math.round(offsetTop + bbox.y * scaleY)
    let width = Math.round(Math.max(1, bbox.w * scaleX))
    let height = Math.round(Math.max(1, bbox.h * scaleY))

    if (containerRect) {
      left = Math.max(0, Math.min(left, containerRect.width - width))
      top = Math.max(0, Math.min(top, containerRect.height - height))
    }

    return { left, top, width, height }
  }

  // ── Analyze form ──
  const analyze = async () => {
    if (!file) { toast.error('Upload a form first'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('language', language)

      const res = await axios.post(`${AI_BASE}/ai/forms/analyze`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })

      if (res.data.success) {
        const returned = res.data.fields || []
        setFormId(res.data.form_id)

        const generateFallbackBbox = (idx, total) => {
          const pageW = Math.max(800, naturalSize.w || 1000)
          const pageH = Math.max(1000, naturalSize.h || 1400)
          const margin = 40
          const availH = pageH - margin * 2
          const itemH = Math.max(24, Math.floor(availH / Math.max(1, total)) - 8)
          return { x: margin, y: margin + idx * (itemH + 8), w: pageW - margin * 2, h: itemH }
        }

        const getFieldPage = (f) => {
          for (const c of [f.page, f.page_number, f.pageNumber]) {
            if (c != null) { const n = Number(c); if (!Number.isNaN(n) && n >= 1) return Math.floor(n) }
          }
          return 1
        }

        const normalized = returned.map((f, i) => {
          let bboxNorm = normalizeBbox(f.bbox)
          if (bboxNorm && looksNormalizedFraction(bboxNorm)) {
            const pageW = Math.max(800, naturalSize.w || 1000)
            const pageH = Math.max(1000, naturalSize.h || 1400)
            bboxNorm = {
              x: Math.round(bboxNorm.x * pageW),
              y: Math.round(bboxNorm.y * pageH),
              w: Math.round(bboxNorm.w * pageW),
              h: Math.round(bboxNorm.h * pageH),
            }
          }
          if (!bboxNorm || (bboxNorm.w === 0 && bboxNorm.h === 0)) {
            bboxNorm = generateFallbackBbox(i, returned.length)
          }
          return { ...f, bboxNorm, page: getFieldPage(f) }
        })

        setFields(normalized)
        const vals = {}
        normalized.forEach(f => { vals[f.id] = f.value || '' })
        setFieldValues(vals)
        setSelectedField(null)
        toast.success(`Detected ${normalized.length} fields`)
      } else {
        toast.error('No fields detected')
      }
    } catch (err) {
      console.error('Analyze error:', err)
      toast.error(err.response?.data?.detail || 'Form analysis failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Value change ──
  const handleValueChange = (id, value) => {
    setFieldValues(prev => ({ ...prev, [id]: value }))
  }

  // ── Draw text onto canvas ──
  const drawTextOnCtx = (ctx, bbox, text) => {
    if (!ctx || !bbox || !text) return
    const padding = Math.max(4, Math.floor(bbox.h * 0.12))
    const fontSize = Math.max(10, Math.floor(bbox.h * 0.65))
    ctx.save()
    ctx.fillStyle = '#000'
    ctx.textBaseline = 'middle'
    ctx.font = `${fontSize}px sans-serif`
    const x = bbox.x + padding
    const y = bbox.y + bbox.h / 2
    ctx.beginPath()
    ctx.rect(bbox.x + 1, bbox.y + 1, Math.max(2, bbox.w - 2), Math.max(2, bbox.h - 2))
    ctx.clip()
    let draw = String(text || '')
    const maxWidth = Math.max(10, bbox.w - padding * 2)
    if (ctx.measureText(draw).width > maxWidth) {
      while (draw.length > 0 && ctx.measureText(draw + '\u2026').width > maxWidth) draw = draw.slice(0, -1)
      draw += '\u2026'
    }
    ctx.fillText(draw, x, y)
    ctx.restore()
  }

  // ── Download filled form ──
  const downloadFilled = async () => {
    try {
      if (isPdf) {
        if (!pdfRef.current) { toast.error('PDF not loaded'); return }
        const pdfDoc = pdfRef.current
        const num = pdfDoc.numPages || totalPages || 1
        const { jsPDF } = await import('jspdf')
        let pdfOut = null

        for (let p = 1; p <= num; p++) {
          const page = await pdfDoc.getPage(p)
          const viewport = page.getViewport({ scale: 1 })
          const off = document.createElement('canvas')
          off.width = Math.round(viewport.width)
          off.height = Math.round(viewport.height)
          const ctx = off.getContext('2d')
          await page.render({ canvasContext: ctx, viewport }).promise

          fields.forEach(f => {
            if ((f.page || 1) !== p) return
            const val = fieldValues[f.id]
            if (val) drawTextOnCtx(ctx, f.bboxNorm, val)
          })

          const dataUrl = off.toDataURL('image/png')
          if (!pdfOut) {
            const orientation = off.width >= off.height ? 'l' : 'p'
            pdfOut = new jsPDF({ orientation, unit: 'px', format: [off.width, off.height] })
            pdfOut.addImage(dataUrl, 'PNG', 0, 0, off.width, off.height)
          } else {
            pdfOut.addPage([off.width, off.height], off.width >= off.height ? 'l' : 'p')
            pdfOut.setPage(pdfOut.getNumberOfPages())
            pdfOut.addImage(dataUrl, 'PNG', 0, 0, off.width, off.height)
          }
        }

        if (!pdfOut) { toast.error('No pages rendered'); return }
        const blob = pdfOut.output('blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file?.name ? `filled-${file.name.replace(/\.[^.]+$/, '')}.pdf` : 'filled-form.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      } else {
        const img = imgRef.current
        if (!img) { toast.error('No image loaded'); return }
        const off = document.createElement('canvas')
        const w = naturalSize.w || img.naturalWidth
        const h = naturalSize.h || img.naturalHeight
        off.width = w; off.height = h
        const ctx = off.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        fields.forEach(f => {
          const val = fieldValues[f.id]
          if (val) drawTextOnCtx(ctx, f.bboxNorm, val)
        })
        const dataUrl = off.toDataURL('image/png')
        const { jsPDF } = await import('jspdf')
        const orientation = w >= h ? 'l' : 'p'
        const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })
        pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
        const blob = pdf.output('blob')
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file?.name ? `filled-${file.name.replace(/\.[^.]+$/, '')}.pdf` : 'filled-form.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
      toast.success('Downloaded!')
    } catch (err) {
      console.error('downloadFilled failed', err)
      toast.error('Download failed')
    }
  }

  // ── AI: Suggest single field ──
  const suggestField = async (field) => {
    if (!field) return
    setSuggestLoading(true)
    setSuggestions([])
    try {
      const res = await axios.post(`${AI_BASE}/ai/forms/suggest`, {
        field: { id: field.id, label_text: field.label_text, semantic_type: field.semantic_type, is_sensitive: field.is_sensitive },
        context: Object.entries(fieldValues).map(([k, v]) => `${k}: ${v}`).join('\n'),
        language,
      })
      const sugg = res.data.suggestions || []
      setSuggestions(sugg)
      if (sugg.length === 1) handleValueChange(field.id, sugg[0])
    } catch {
      toast.error('Suggestion failed')
    } finally {
      setSuggestLoading(false)
    }
  }

  // ── AI: Auto-fill all ──
  const autoFillAll = async () => {
    setSuggestLoading(true)
    try {
      const res = await axios.post(`${AI_BASE}/ai/forms/suggest-all`, {
        fields: fields.filter(f => !f.is_sensitive).map(f => ({
          id: f.id, label_text: f.label_text, semantic_type: f.semantic_type, is_sensitive: f.is_sensitive,
        })),
        context: Object.entries(fieldValues).map(([k, v]) => `${k}: ${v}`).join('\n'),
        language,
      })
      const map = res.data.values || {}
      if (Object.keys(map).length) {
        setFieldValues(prev => ({ ...prev, ...map }))
        toast.success(`Auto-filled ${Object.keys(map).length} fields`)
      } else {
        toast.error('No suggestions returned')
      }
    } catch {
      toast.error('Auto-fill failed')
    } finally {
      setSuggestLoading(false)
    }
  }

  // ── AI: Free-form assist ──
  const askAi = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await axios.post(`${AI_BASE}/ai/forms/assist`, {
        prompt: aiPrompt,
        fields: fields.map(f => ({ ...f, value: fieldValues[f.id] || '' })),
        context: fields.map(f => `${f.label_text}: ${fieldValues[f.id] || ''}`).join('\n'),
        language,
      })
      setAiResponse(res.data.response || 'No response')
    } catch {
      toast.error('AI assist failed')
    } finally {
      setAiLoading(false)
      setAiPrompt('')
    }
  }

  // ── Reset ──
  const resetAll = () => {
    setFile(null)
    setImageUrl(null)
    setFields([])
    setFieldValues({})
    setSelectedField(null)
    setFormId(null)
    setAiResponse('')
    setSuggestions([])
    setCurrentPage(1)
    setTotalPages(1)
    setPdfRenderError(null)
  }

  // ── Examples for field ──
  const examplesForField = (field) => {
    if (!field) return []
    const label = (field.label_text || '').toLowerCase()
    if (label.includes('name') && (label.includes('first') || label.includes('given'))) return ['Rahul', 'Priya', 'Amit']
    if (label.includes('name')) return ['Rahul Sharma', 'Priya Patel', 'Amit Kumar']
    if (label.includes('email')) return ['name@example.com', 'user@gmail.com']
    if (label.includes('phone') || label.includes('mobile')) return ['+91 98765 43210', '+91 87654 32109']
    if (label.includes('address')) return ['123 MG Road, Sector 5', 'Flat 4B, 56 High St']
    if (label.includes('pin') || label.includes('zip')) return ['110001', '400001', '560001']
    if (label.includes('date')) return ['01/01/2025', '15/06/2024']
    if (label.includes('age')) return ['25', '30', '45']
    if (label.includes('gender')) return ['Male', 'Female', 'Other']
    return []
  }

  // ── Computed ──
  const filledCount = fields.filter(f => fieldValues[f.id]?.trim()).length
  const hasEdits = filledCount > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/nyaymitra')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">NyayMitra</p>
          <h1 className="text-xl font-semibold">Form Auto-Fill</h1>
          <p className="text-xs text-muted-foreground">Upload a government form — AI detects & helps fill fields</p>
        </div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1 bg-card"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="gu">ગુજરાતી</option>
          <option value="ta">தமிழ்</option>
          <option value="mr">मराठी</option>
        </select>
      </div>

      {/* Upload + Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="cursor-pointer inline-flex items-center gap-2 h-8 px-3 text-xs rounded-md font-medium border border-border bg-transparent hover:bg-secondary text-foreground transition-colors">
          <Upload size={14} />
          <span>{file ? 'Change File' : 'Upload Form'}</span>
          <input type="file" accept="image/*,.pdf" onChange={onFileChange} className="hidden" />
        </label>
        {file && (
          <>
            <Badge variant="secondary" className="text-[10px]">
              <FileText size={10} className="mr-1" /> {file.name}
            </Badge>
            <Button variant="default" size="sm" onClick={analyze} disabled={loading} loading={loading}>
              {loading ? 'Analyzing...' : 'Analyze Form'}
            </Button>
            <Button
              variant={hasEdits ? 'default' : 'secondary'}
              size="sm"
              onClick={downloadFilled}
              disabled={!hasEdits}
            >
              <Download size={14} /> Download Filled
            </Button>
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <RotateCcw size={14} />
            </Button>
            {fields.length > 0 && (
              <Badge variant={filledCount === fields.length ? 'success' : 'warning'} className="text-[10px]">
                {filledCount}/{fields.length} filled
              </Badge>
            )}
          </>
        )}
      </div>

      {/* No file state */}
      {!file && (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload size={28} className="text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Upload a Government Form</p>
                <p className="text-xs text-muted-foreground">
                  PDF or image — RTI forms, complaint forms, applications, etc.
                </p>
              </div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 h-9 px-4 py-2 text-sm rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <FileText size={14} /> Choose File
                <input type="file" accept="image/*,.pdf" onChange={onFileChange} className="hidden" />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main workspace */}
      {file && (
        <div className="flex gap-4" style={{ minHeight: 600 }}>
          {/* ── Left: Document Preview ── */}
          <div ref={containerRef} className="relative bg-muted/20 border border-border rounded-lg flex-1 overflow-hidden">
            {/* PDF page navigation */}
            {isPdf && totalPages > 1 && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/90 backdrop-blur px-2 py-1 rounded-md border border-border shadow-sm">
                <button
                  onClick={() => renderPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-muted-foreground px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => renderPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Canvas / Image */}
            {imageUrl ? (
              isPdf ? (
                <div className="w-full h-auto">
                  <canvas ref={pdfCanvasRef} />
                  {pdfRenderError && (
                    <div className="p-3 m-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                      {pdfRenderError}
                    </div>
                  )}
                </div>
              ) : (
                <img ref={imgRef} src={imageUrl} alt="form" onLoad={onImageLoad} className="w-full h-auto block" />
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">Upload a form to preview</div>
            )}

            {/* Field bbox overlays */}
            {fields.map(f => {
              const fPage = f.page || 1
              if (isPdf && fPage !== currentPage) return null
              const pos = scaleBbox(f.bboxNorm)
              if (!pos) return null
              const value = fieldValues[f.id]
              const isFilled = !!value?.trim()
              const isSelected = selectedField?.id === f.id

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedField(f)}
                  style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
                  className={`absolute cursor-pointer transition-all border-2 rounded-sm ${
                    isSelected
                      ? 'border-primary bg-primary/15 ring-2 ring-primary/30 z-10'
                      : isFilled
                        ? 'border-govgreen-500/60 bg-govgreen-500/8'
                        : 'border-saffron-400/60 bg-saffron-400/8 hover:bg-saffron-400/15'
                  }`}
                  title={f.label_text || f.id}
                >
                  {isFilled && (
                    <span
                      className="pointer-events-none absolute inset-0 flex items-center px-1 overflow-hidden text-govgreen-800 dark:text-govgreen-300 font-medium"
                      style={{ fontSize: Math.max(9, Math.min(14, Math.floor(pos.height * 0.6))) }}
                    >
                      {value}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Right: Field Inspector ── */}
          <div className="w-[340px] flex-shrink-0 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Loading */}
            {loading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Loader2 size={24} className="animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium">Analyzing form...</p>
                  <p className="text-xs text-muted-foreground mt-1">Detecting fields & generating descriptions</p>
                </CardContent>
              </Card>
            )}

            {/* No fields yet */}
            {!loading && fields.length === 0 && file && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Sparkles size={20} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click <strong>&quot;Analyze Form&quot;</strong> to detect fillable fields
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Fields list */}
            {fields.length > 0 && !loading && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Fields ({fields.length})</CardTitle>
                    <Button variant="outline" size="sm" onClick={autoFillAll} loading={suggestLoading} disabled={suggestLoading} className="text-[10px] h-7">
                      <Wand2 size={12} /> Auto-Fill All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[350px] overflow-y-auto">
                  {fields.map(f => {
                    const isSelected = selectedField?.id === f.id
                    const isFilled = !!fieldValues[f.id]?.trim()
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedField(f)}
                        className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : isFilled
                              ? 'border-govgreen-300 dark:border-govgreen-700 bg-govgreen-50 dark:bg-govgreen-900/20'
                              : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isFilled
                            ? <CheckCircle2 size={11} className="text-govgreen-500 flex-shrink-0" />
                            : <AlertCircle size={11} className="text-saffron-500 flex-shrink-0" />
                          }
                          <p className="text-xs font-medium truncate flex-1">{f.label_text || f.id}</p>
                          <Badge variant="secondary" className="text-[8px]">{f.semantic_type}</Badge>
                        </div>
                        <input
                          type={f.semantic_type === 'date' ? 'date' : 'text'}
                          value={fieldValues[f.id] || ''}
                          onChange={e => handleValueChange(f.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder={`Enter ${(f.label_text || '').toLowerCase()}`}
                          className="mt-1.5 w-full text-xs border border-border rounded px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Selected Field Detail */}
            {selectedField && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle size={14} className="text-primary" />
                    {selectedField.label_text || selectedField.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedField.description && (
                    <p className="text-[11px] text-muted-foreground">{selectedField.description}</p>
                  )}

                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[8px]">Type: {selectedField.semantic_type}</Badge>
                    <Badge variant="outline" className="text-[8px]">Page: {selectedField.page || 1}</Badge>
                    {selectedField.is_sensitive && <Badge variant="destructive" className="text-[8px]">Sensitive</Badge>}
                  </div>

                  {/* Backend suggestions */}
                  {selectedField.suggestions?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Suggestions</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedField.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleValueChange(selectedField.id, s)} className="px-2 py-0.5 bg-secondary rounded text-[10px] hover:bg-secondary/80 transition-colors">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {examplesForField(selectedField).length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Examples</p>
                      <div className="flex flex-wrap gap-1">
                        {examplesForField(selectedField).map((ex, i) => (
                          <button key={i} onClick={() => handleValueChange(selectedField.id, ex)} className="px-2 py-0.5 border border-border rounded text-[10px] hover:bg-secondary transition-colors">{ex}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI suggest button */}
                  <Button variant="secondary" size="sm" className="w-full text-xs h-7" onClick={() => suggestField(selectedField)} loading={suggestLoading}>
                    <Sparkles size={12} /> Get AI Suggestions
                  </Button>

                  {/* AI suggestions */}
                  {suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">AI Suggestions</p>
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => { handleValueChange(selectedField.id, s); toast.success('Applied') }} className="w-full text-left text-xs px-2 py-1.5 rounded border border-border hover:bg-secondary transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Value input */}
                  <div>
                    <label className="text-[10px] text-muted-foreground">Value</label>
                    <input
                      value={fieldValues[selectedField.id] || ''}
                      onChange={e => handleValueChange(selectedField.id, e.target.value)}
                      className="w-full mt-1 text-xs border border-border rounded px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Assist */}
            {fields.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aiResponse && (
                    <div className="text-xs bg-secondary/50 rounded-md p-3 border border-border whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {aiResponse}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && askAi()}
                      placeholder="Ask about any field..."
                      className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button variant="default" size="sm" onClick={askAi} loading={aiLoading} disabled={aiLoading || !aiPrompt.trim()}>
                      <Send size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
