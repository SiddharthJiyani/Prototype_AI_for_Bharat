import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Download, Save, Loader2, Plus, Trash2, AlertTriangle, History, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getUserId } from '@/utils/userId'
import { exportBudgetPdf } from '@/utils/pdfExport'
import { useLanguage } from '@/context/LanguageContext'

const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000'
const YEAR = new Date().getFullYear()

const DEFAULT_CATEGORIES = [
  { category: 'Water & Sanitation', allocated: 0, spent: 0 },
  { category: 'Road Construction', allocated: 0, spent: 0 },
  { category: 'Education Infrastructure', allocated: 0, spent: 0 },
  { category: 'Health & Nutrition', allocated: 0, spent: 0 },
  { category: 'MGNREGA Works', allocated: 0, spent: 0 },
  { category: 'Administrative', allocated: 0, spent: 0 },
]

const fmt = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`

export default function BudgetAllocation() {
  const navigate = useNavigate()
  const { language, t, translateText, translateBatch } = useLanguage()
  const panchayatId = getUserId()
  const [items, setItems] = useState(DEFAULT_CATEGORIES)
  const [suggestions, setSuggestions] = useState(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Fetch saved budget ──
  useEffect(() => {
    ; (async () => {
      try {
        const res = await axios.get(`/api/budget/${panchayatId}`)
        if (res.data?.allocations?.length) {
          setItems(res.data.allocations)
        }
      } catch {
        // no saved budget yet — use defaults
      } finally {
        setLoaded(true)
      }
    })()
  }, [panchayatId])

  // ── Save budget ──
  const saveBudget = async () => {
    setSaving(true)
    try {
      await axios.post('/api/budget', {
        panchayatId,
        year: YEAR,
        allocations: items,
      })
      toast.success(t('budget_saved'))
      // refresh history if open
      if (historyOpen) fetchHistory()
    } catch {
      toast.error(t('failed_save_budget'))
    } finally {
      setSaving(false)
    }
  }

  // ── Budget history ──
  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await axios.get(`/api/budget/${panchayatId}/history`)
      setHistory(res.data.budgets || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleHistory = () => {
    if (!historyOpen && history.length === 0) fetchHistory()
    setHistoryOpen(o => !o)
  }

  // ── Ask AI for suggestions ──
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    setSuggestions(null)
    try {
      const currentAllocations = {}
      items.forEach(i => { currentAllocations[i.category] = i.allocated })

      const res = await axios.post(`${AI_BASE}/ai/budget/suggest`, {
        panchayatId,
        population: 2000,
        current_allocations: currentAllocations,
        grievances: [],
        active_schemes: [],
      }, { timeout: 60000 })
      setSuggestions(res.data)

      // Translate suggestions if not English
      if (language !== 'en') {
        try {
          const s = res.data
          const [reasoning, priorities, risks] = await Promise.all([
            s.reasoning ? translateText(s.reasoning) : Promise.resolve(s.reasoning),
            s.priority_areas?.length ? translateBatch(s.priority_areas) : Promise.resolve(s.priority_areas),
            s.risk_flags?.length ? translateBatch(s.risk_flags) : Promise.resolve(s.risk_flags),
          ])
          setSuggestions(prev => ({ ...prev, reasoning, priority_areas: priorities, risk_flags: risks }))
        } catch { /* keep original */ }
      }

      toast.success(t('ai_suggestions_loaded'))
    } catch {
      toast.error(t('ai_suggestion_failed'))
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // ── Inline editing helpers ──
  const updateField = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: Math.max(0, Number(value) || 0) } : item))
  }

  const removeCategory = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const addCategory = () => {
    if (!newCat.trim()) return
    setItems(prev => [...prev, { category: newCat.trim(), allocated: 0, spent: 0 }])
    setNewCat('')
  }

  const totalAllocated = items.reduce((a, b) => a + b.allocated, 0)
  const totalSpent = items.reduce((a, b) => a + b.spent, 0)
  const utilisation = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> {t('back_to_dashboard')}
      </button>

      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">{t('budget_allocation')}</h1>
          <p className="text-sm text-muted-foreground">{t('budget_subtitle').replace('{year}', YEAR)}</p>
        </div>
        <div className="flex items-center gap-3">

          <Button
            variant={suggestions ? 'default' : 'outline'}
            size="sm"
            onClick={fetchSuggestions}
            disabled={loadingSuggestions}
            className="gap-1.5"
          >
            {loadingSuggestions ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
            {t('ai_suggestions')}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">{t('total_allocated')}</p>
          <p className="text-xl font-bold mt-1">{fmt(totalAllocated)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">{t('spent')}</p>
          <p className="text-xl font-bold mt-1">{fmt(totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">{t('utilisation')}</p>
          <p className="text-xl font-bold mt-1">{utilisation}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(utilisation, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Budget table — editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('category_breakdown')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0 divide-y divide-border">
            <div className="grid grid-cols-[1fr_100px_100px_60px] pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>{t('category')}</span>
              <span className="text-right">{t('allocated')}</span>
              <span className="text-right">{t('spent')}</span>
              <span />
            </div>

            {items.map((item, idx) => {
              const pct = item.allocated > 0 ? Math.round((item.spent / item.allocated) * 100) : 0
              return (
                <div key={idx} className="py-3 space-y-1.5">
                  <div className="grid grid-cols-[1fr_100px_100px_60px] text-sm items-center gap-2">
                    <span className="font-medium truncate">{item.category}</span>
                    <input
                      type="number"
                      value={item.allocated || ''}
                      onChange={e => updateField(idx, 'allocated', e.target.value)}
                      placeholder="0"
                      className="w-full text-right rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={item.spent || ''}
                      onChange={e => updateField(idx, 'spent', e.target.value)}
                      placeholder="0"
                      className="w-full text-right rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button onClick={() => removeCategory(idx)} className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}

            {/* Add new category */}
            <div className="pt-3 flex gap-2">
              <input
                type="text"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder={t('new_category_placeholder')}
                className="flex-1 rounded border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={addCategory} disabled={!newCat.trim()} className="gap-1">
                <Plus size={12} /> {t('add')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('ai_recommendation')}</p>

            {suggestions.reasoning && (
              <p className="text-sm leading-relaxed">{suggestions.reasoning}</p>
            )}

            {suggestions.suggested_allocations && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t('suggested_allocations')}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(suggestions.suggested_allocations).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between border-b border-border/50 py-0.5">
                      <span className="truncate">{cat}</span>
                      <span className="font-medium">{fmt(Number(amt))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.priority_areas?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('priority_areas')}</p>
                <ul className="text-xs space-y-0.5">
                  {suggestions.priority_areas.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.risk_flags?.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-1">
                <p className="text-xs font-medium flex items-center gap-1 text-destructive"><AlertTriangle size={12} /> {t('risk_flags')}</p>
                <ul className="text-xs space-y-0.5">
                  {suggestions.risk_flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestions.per_capita_spend && (
              <p className="text-xs text-muted-foreground">{t('per_capita_spend')} <span className="font-medium">{fmt(Number(suggestions.per_capita_spend))}</span></p>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!suggestions.suggested_allocations) return
                setItems(prev => prev.map(item => {
                  const suggested = suggestions.suggested_allocations[item.category]
                  return suggested ? { ...item, allocated: Number(suggested) } : item
                }))
                toast.success(t('applied_suggestions'))
              }}
            >
              {t('apply_suggestions')}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={() => {
          exportBudgetPdf({ items, totalAllocated, totalSpent, utilisation, year: YEAR, panchayatId, suggestions })
          toast.success('PDF downloaded')
        }}>
          <Download size={14} /> {t('export_report')}
        </Button>
        <Button className="gap-2" onClick={saveBudget} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {t('save_budget')}
        </Button>
      </div>

      {/* Budget History */}
      <div>
        <button
          onClick={toggleHistory}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <History size={14} />
          {t('budget_history')}
          {historyOpen ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
        </button>

        {historyOpen && (
          <div className="mt-3 space-y-3">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">{t('no_budget_history')}</p>
            ) : (
              history.map((budget, idx) => {
                const allocs = budget.allocations || []
                const hTotal = allocs.reduce((s, a) => s + (a.allocated || 0), 0)
                const hSpent = allocs.reduce((s, a) => s + (a.spent || 0), 0)
                const hUtil = hTotal > 0 ? Math.round((hSpent / hTotal) * 100) : 0
                const isCurrent = String(budget.year) === String(YEAR)

                return (
                  <Card key={idx} className={isCurrent ? 'border-primary/40' : ''}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">FY {budget.year}</p>
                          {isCurrent && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{t('current')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{t('allocated')}: <span className="font-medium text-foreground">{fmt(hTotal)}</span></span>
                          <span>{t('spent')}: <span className="font-medium text-foreground">{fmt(hSpent)}</span></span>
                          <span>{t('utilisation')}: <span className="font-medium text-foreground">{hUtil}%</span></span>
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${Math.min(hUtil, 100)}%` }} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                        {allocs.map((a, ai) => (
                          <div key={ai} className="flex justify-between text-xs border-b border-border/40 py-0.5">
                            <span className="truncate text-muted-foreground">{a.category}</span>
                            <span className="font-medium shrink-0 ml-2">{fmt(a.allocated)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        {!isCurrent && (
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
                            setItems(allocs.map(a => ({ ...a })))
                            toast.success(`Loaded FY ${budget.year} budget`)
                          }}>
                            {t('load_as_draft')}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
                          exportBudgetPdf({ items: allocs, totalAllocated: hTotal, totalSpent: hSpent, utilisation: hUtil, year: budget.year, panchayatId, suggestions: null })
                          toast.success('PDF downloaded')
                        }}>
                          <Download size={11} /> PDF
                        </Button>
                      </div>

                      {budget.updatedAt && (
                        <p className="text-[10px] text-muted-foreground">{t('last_updated')} {new Date(budget.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
