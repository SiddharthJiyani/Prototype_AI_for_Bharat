import { Router } from 'express'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/**
 * POST /api/ecourts/file
 * Mock eCourts filing — generates a case number and stores it.
 */
router.post('/file', async (req, res) => {
  try {
    const { caseId, userId, type, notice } = req.body
    const courtRef = `ECT/2026/${Math.floor(10000 + Math.random() * 90000)}`
    const now = new Date().toISOString()

    await dynamo.send(new PutCommand({
      TableName: TABLES.CASES,
      Item: {
        PK: `CASE#${caseId}`,
        SK: 'ECOURT',
        courtRef,
        filedAt: now,
        status: 'Submitted to eCourts (Mock)',
      },
    }))

    return res.json({
      success: true,
      caseId,
      courtRef,
      message: `Case submitted. Reference: ${courtRef}`,
      filedAt: now,
    })
  } catch (err) {
    return res.status(500).json({ error: 'eCourts filing failed' })
  }
})

export default router
