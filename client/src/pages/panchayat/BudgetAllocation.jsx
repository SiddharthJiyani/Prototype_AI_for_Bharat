import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const BUDGET_ITEMS = [
  { category: 'Water & Sanitation', allocated: 350000, spent: 180000, suggested: 420000 },
  { category: 'Road Construction', allocated: 250000, spent: 250000, suggested: 300000 },
  { category: 'Education Infrastructure', allocated: 150000, spent: 80000, suggested: 150000 },
  { category: 'Health & Nutrition', allocated: 100000, spent: 40000, suggested: 180000 },
  { category: 'MGNREGA Works', allocated: 400000, spent: 310000, suggested: 400000 },
  { category: 'Administrative', allocated: 50000, spent: 38000, suggested: 50000 },
]

const TOTAL = 1500000

const fmt = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`

export default function BudgetAllocation() {
  const [showSuggested, setShowSuggested] = useState(false)
  const navigate = useNavigate()

  const totalSpent = BUDGET_ITEMS.reduce((a, b) => a + b.spent, 0)
  const utilisation = Math.round((totalSpent / TOTAL) * 100)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <button
        onClick={() => navigate('/panchayat')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Budget Allocation</h1>
          <p className="text-sm text-muted-foreground">AI-assisted planning for annual Panchayat budget</p>
        </div>
        <Button
          variant={showSuggested ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSuggested(!showSuggested)}
          className="gap-1.5"
        >
          <TrendingUp size={13} /> AI Suggestions
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-xl font-bold mt-1">{fmt(TOTAL)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-xl font-bold mt-1">{fmt(totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="text-xs text-muted-foreground">Utilisation</p>
          <p className="text-xl font-bold mt-1">{utilisation}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-foreground rounded-full" style={{ width: `${utilisation}%` }} />
          </div>
        </div>
      </div>

      {/* Budget table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0 divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Category</span>
              <span className="text-right">Allocated</span>
              <span className="text-right">Spent</span>
              <span className="text-right">{showSuggested ? 'AI Suggested' : 'Remaining'}</span>
            </div>

            {BUDGET_ITEMS.map((item) => {
              const remaining = item.allocated - item.spent
              const pct = Math.round((item.spent / item.allocated) * 100)
              return (
                <div key={item.category} className="py-3 space-y-1.5">
                  <div className="grid grid-cols-4 text-sm items-center">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-right text-muted-foreground">{fmt(item.allocated)}</span>
                    <span className="text-right">{fmt(item.spent)}</span>
                    <span className={`text-right font-medium ${showSuggested ? 'text-foreground' : remaining < 0 ? 'text-destructive' : ''}`}>
                      {showSuggested ? fmt(item.suggested) : fmt(remaining)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {showSuggested && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">AI Recommendation</p>
            <p className="text-sm leading-relaxed">
              Based on 5 pending MGNREGA wage disputes and low health expenditure, consider increasing Health &amp; Nutrition allocation by ₹80,000 and deferring road construction to next quarter pending BDO approval.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Download size={14} /> Export Report
        </Button>
        <Button>Submit for BDO Approval</Button>
      </div>
    </div>
  )
}
