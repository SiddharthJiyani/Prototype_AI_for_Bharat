import { Router } from 'express'
import { QueryCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

const MGNREGA_THRESHOLD = 5

/**
 * POST /api/integration/analyze
 * Scan recent cases for a panchayat, fire alert if MGNREGA threshold crossed.
 */
router.post('/analyze', async (req, res) => {
  try {
    const { panchayatId } = req.body
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // TODO: real GSI filter by panchayatId + createdAt
    const result = await dynamo.send(new ScanCommand({ TableName: TABLES.CASES }))
    const cases = (result.Items || []).filter(
      c => c.panchayatId === panchayatId && c.createdAt > thirtyDaysAgo
    )

    const mgnregaCases = cases.filter(c => c.type === 'MGNREGA Wage Dispute')

    if (mgnregaCases.length >= MGNREGA_THRESHOLD) {
      const alertId = `ALERT#${panchayatId}#MGNREGA#${Date.now()}`
      await dynamo.send(new PutCommand({
        TableName: TABLES.ALERTS,
        Item: {
          PK: alertId,
          SK: 'ALERT',
          panchayatId,
          type: 'MGNREGA_PATTERN',
          count: mgnregaCases.length,
          message: `${mgnregaCases.length} MGNREGA wage complaints detected this month. Consider escalating to BDO for payment release.`,
          severity: 'warning',
          createdAt: new Date().toISOString(),
          resolved: false,
        },
      }))
    }

    return res.json({ analyzed: cases.length, mgnregaCount: mgnregaCases.length, alertFired: mgnregaCases.length >= MGNREGA_THRESHOLD })
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed' })
  }
})

/** GET /api/integration/alerts/:panchayatId */
router.get('/alerts/:panchayatId', async (req, res) => {
  try {
    // TODO: replace with proper GSI query
    const result = await dynamo.send(new ScanCommand({ TableName: TABLES.ALERTS }))
    const alerts = (result.Items || []).filter(a => a.panchayatId === req.params.panchayatId && !a.resolved)
    return res.json({ alerts })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

export default router
