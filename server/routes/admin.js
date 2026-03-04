import { Router } from 'express'
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'
import nodemailer from 'nodemailer'

const router = Router()

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats  (existing — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [casesRes, grievancesRes, alertsRes, meetingsRes] = await Promise.all([
      dynamo.send(new ScanCommand({ TableName: TABLES.CASES })),
      dynamo.send(new ScanCommand({ TableName: TABLES.GRIEVANCES })),
      dynamo.send(new ScanCommand({ TableName: TABLES.ALERTS })),
      dynamo.send(new ScanCommand({ TableName: TABLES.MEETINGS })),
    ])

    const cases     = casesRes.Items || []
    const grievances = grievancesRes.Items || []
    const alerts    = (alertsRes.Items || []).filter(a => !a.resolved)
    const meetings  = meetingsRes.Items || []

    const now = new Date()
    const monthly = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthly[key] = { month: MONTH_LABELS[d.getMonth()], cases: 0, grievances: 0 }
    }
    cases.forEach(c => { if (c.createdAt && monthly[c.createdAt.slice(0,7)]) monthly[c.createdAt.slice(0,7)].cases++ })
    grievances.forEach(g => { if (g.createdAt && monthly[g.createdAt.slice(0,7)]) monthly[g.createdAt.slice(0,7)].grievances++ })

    const typeMap = {}
    cases.forEach(c => { const t = c.type || 'Other'; typeMap[t] = (typeMap[t] || 0) + 1 })
    const caseTypes = Object.entries(typeMap).sort((a,b) => b[1]-a[1]).slice(0,6).map(([type,count]) => ({ type, count }))

    const panchayatSet = new Set([
      ...cases.map(c => c.panchayatId).filter(Boolean),
      ...grievances.map(g => g.panchayatId).filter(Boolean),
    ])

    const recentAlerts = alerts
      .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''))
      .slice(0,10)
      .map(a => ({
        id: a.PK, panchayat: a.panchayatId||'Unknown', message: a.message||'',
        severity: a.severity||'warning', type: a.type||'PATTERN',
        count: a.count||0, createdAt: a.createdAt, time: formatRelativeTime(a.createdAt),
      }))

    return res.json({
      stats: {
        totalCases: cases.length, totalGrievances: grievances.length,
        totalMeetings: meetings.length, activePanchayats: panchayatSet.size,
        openAlerts: alerts.length, resolvedCases: cases.filter(c => c.status === 'Resolved').length,
      },
      monthly: Object.values(monthly),
      caseTypes,
      statusBreakdown: cases.reduce((m,c) => { const s=c.status||'Filed'; m[s]=(m[s]||0)+1; return m }, {}),
      alerts: recentAlerts,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/cases  — all cases, newest first, with merged user info
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cases', async (req, res) => {
  try {
    const [casesRes, usersRes] = await Promise.all([
      dynamo.send(new ScanCommand({
        TableName: TABLES.CASES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'METADATA' },
      })),
      dynamo.send(new ScanCommand({ TableName: TABLES.USERS })).catch(() => ({ Items: [] })),
    ])

    // Build userId → user map
    const userMap = {}
    ;(usersRes.Items || []).forEach(u => {
      const uid = u.userId || (u.PK ? u.PK.replace('USER#', '') : null)
      if (uid) userMap[uid] = u
    })

    const cases = (casesRes.Items || [])
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map(c => {
        const u = userMap[c.userId] || {}
        return {
          caseId:         c.caseId,
          type:           c.type || 'Unknown',
          status:         c.status || 'Filed',
          panchayatId:    c.panchayatId || '—',
          language:       c.language || 'en',
          lawCited:       c.lawCited || null,
          isSigned:       c.isSigned || false,
          maskedAadhaar:  c.maskedAadhaar || null,
          dispatchedAt:   c.dispatchedAt || null,
          respondentEmail:c.respondentEmail || null,
          createdAt:      c.createdAt,
          updatedAt:      c.updatedAt,
          // First 200 chars as gist
          gist:           (c.description || c.transcript || '').slice(0, 200),
          // User info
          userId:         c.userId || null,
          userName:       u.name || u.displayName || null,
          userEmail:      u.email || null,
          userPhone:      u.phone || null,
        }
      })

    return res.json({ cases, total: cases.length })
  } catch (err) {
    console.error('Admin /cases error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/cases/:caseId  — full case detail + timeline events
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cases/:caseId', async (req, res) => {
  try {
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLES.CASES,
      FilterExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `CASE#${req.params.caseId}` },
    }))

    const items    = result.Items || []
    const metadata = items.find(i => i.SK === 'METADATA')
    const events   = items
      .filter(i => i.SK?.startsWith('EVENT#'))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

    if (!metadata) return res.status(404).json({ error: 'Case not found' })

    // Try to fetch user row
    let user = {}
    if (metadata.userId) {
      try {
        const ur = await dynamo.send(new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: 'userId = :uid',
          ExpressionAttributeValues: { ':uid': metadata.userId },
        }))
        user = ur.Items?.[0] || {}
      } catch { /* graceful */ }
    }

    return res.json({
      ...metadata,
      timeline: events,
      user: {
        name:  user.name || user.displayName || null,
        email: user.email || null,
        phone: user.phone || null,
      },
    })
  } catch (err) {
    console.error('Admin case detail error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/cases/:caseId/followup  — send follow-up email
// Body: { toEmail, message, adminName }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cases/:caseId/followup', async (req, res) => {
  try {
    const { caseId } = req.params
    const { toEmail, message, adminName = 'IntegratedGov Admin' } = req.body

    if (!toEmail || !message) {
      return res.status(400).json({ error: 'toEmail and message are required' })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    })

    const sentAt   = new Date().toISOString()
    const divider  = '─'.repeat(60)
    const emailBody = [
      `Follow-up on Your Complaint — Case ID: ${caseId}`,
      divider,
      '',
      message,
      '',
      divider,
      `Sent by: ${adminName} via IntegratedGov AI Platform`,
      `Case Reference: ${caseId}`,
      `Sent At: ${new Date(sentAt).toLocaleString('en-IN')}`,
      divider,
    ].join('\n')

    await transporter.sendMail({
      from:    `"IntegratedGov Admin" <${process.env.MAIL_USER}>`,
      to:      toEmail,
      subject: `Follow-up on Your Complaint [Case: ${caseId}]`,
      text:    emailBody,
    })

    // Write timeline event on the case
    const eventId = `EVT${Date.now()}`
    await dynamo.send(new PutCommand({
      TableName: TABLES.CASES,
      Item: {
        PK:          `CASE#${caseId}`,
        SK:          `EVENT#${eventId}`,
        eventId,
        description: `Admin follow-up email sent to ${toEmail}: "${message.slice(0, 120)}${message.length > 120 ? '…' : ''}"`,
        eventType:   'admin_followup',
        createdAt:   sentAt,
      },
    }))

    return res.json({ success: true, sentAt })
  } catch (err) {
    console.error('Admin followup error:', err)
    return res.status(500).json({ error: 'Failed to send follow-up: ' + err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/grievances  — all panchayat grievances
// ─────────────────────────────────────────────────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLES.GRIEVANCES,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'METADATA' },
    }))
    const grievances = (result.Items || []).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''))
    return res.json({ grievances, total: grievances.length })
  } catch (err) {
    console.error('Admin /grievances error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/meetings  — all panchayat meetings (lightweight list)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meetings', async (req, res) => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLES.MEETINGS }))
    const meetings = (result.Items || [])
      .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''))
      .map(({ meetingId, meetingDate, location, attendees, meetingType, panchayatId, createdAt, SK, PK }) =>
        ({ meetingId, meetingDate, location, attendees, meetingType, panchayatId, createdAt, SK, PK })
      )
    return res.json({ meetings, total: meetings.length })
  } catch (err) {
    console.error('Admin /meetings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/meetings/:panchayatId/:sk  — full meeting detail incl. minutes
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meetings/:panchayatId/:sk', async (req, res) => {
  try {
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb')
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.MEETINGS,
      Key: {
        PK: `PANCHAYAT#${req.params.panchayatId}`,
        SK: decodeURIComponent(req.params.sk),
      },
    }))
    if (!result.Item) return res.status(404).json({ error: 'Meeting not found' })
    return res.json(result.Item)
  } catch (err) {
    console.error('Admin meeting detail error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/budget  — all panchayat budget records
// ─────────────────────────────────────────────────────────────────────────────
router.get('/budget', async (req, res) => {
  try {
    const result = await dynamo.send(new ScanCommand({ TableName: TABLES.BUDGET }))
    const budgets = (result.Items || []).sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''))
    return res.json({ budgets, total: budgets.length })
  } catch (err) {
    console.error('Admin /budget error:', err)
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
