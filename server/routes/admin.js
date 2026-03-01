import { Router } from 'express'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * GET /api/admin/stats
 * Aggregates real data from DynamoDB for the admin dashboard.
 */
router.get('/stats', async (req, res) => {
  try {
    // Parallel scan of all tables we need
    const [casesRes, grievancesRes, alertsRes, meetingsRes] = await Promise.all([
      dynamo.send(new ScanCommand({ TableName: TABLES.CASES })),
      dynamo.send(new ScanCommand({ TableName: TABLES.GRIEVANCES })),
      dynamo.send(new ScanCommand({ TableName: TABLES.ALERTS })),
      dynamo.send(new ScanCommand({ TableName: TABLES.MEETINGS })),
    ])

    const cases = casesRes.Items || []
    const grievances = grievancesRes.Items || []
    const alerts = (alertsRes.Items || []).filter(a => !a.resolved)
    const meetings = meetingsRes.Items || []

    // ── Monthly case trend (last 6 months) ──
    const now = new Date()
    const monthly = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthly[key] = { month: MONTH_LABELS[d.getMonth()], cases: 0, grievances: 0 }
    }

    cases.forEach(c => {
      if (!c.createdAt) return
      const key = c.createdAt.slice(0, 7)
      if (monthly[key]) monthly[key].cases++
    })
    grievances.forEach(g => {
      if (!g.createdAt) return
      const key = g.createdAt.slice(0, 7)
      if (monthly[key]) monthly[key].grievances++
    })

    // ── Case type distribution ──
    const typeMap = {}
    cases.forEach(c => {
      const type = c.type || 'Other'
      typeMap[type] = (typeMap[type] || 0) + 1
    })
    const caseTypes = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count]) => ({ type, count }))

    // ── Active panchayats ──
    const panchayatSet = new Set([
      ...cases.map(c => c.panchayatId).filter(Boolean),
      ...grievances.map(g => g.panchayatId).filter(Boolean),
    ])

    // ── Case status breakdown ──
    const statusMap = {}
    cases.forEach(c => {
      const s = c.status || 'Filed'
      statusMap[s] = (statusMap[s] || 0) + 1
    })

    // ── Recent alerts (last 10, newest first) ──
    const recentAlerts = alerts
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10)
      .map(a => ({
        id: a.PK,
        panchayat: a.panchayatId || 'Unknown Panchayat',
        message: a.message || '',
        severity: a.severity || 'warning',
        type: a.type || 'PATTERN',
        count: a.count || 0,
        createdAt: a.createdAt,
        time: formatRelativeTime(a.createdAt),
      }))

    // ── Stats ──
    const stats = {
      totalCases: cases.length,
      totalGrievances: grievances.length,
      totalMeetings: meetings.length,
      activePanchayats: panchayatSet.size,
      openAlerts: alerts.length,
      resolvedCases: cases.filter(c => c.status === 'Resolved').length,
    }

    return res.json({
      stats,
      monthly: Object.values(monthly),
      caseTypes,
      statusBreakdown: statusMap,
      alerts: recentAlerts,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: err.message })
  }
})

function formatRelativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default router
