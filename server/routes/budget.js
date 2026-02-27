import { Router } from 'express'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { panchayatId, year, allocations } = req.body
    await dynamo.send(new PutCommand({
      TableName: TABLES.BUDGET,
      Item: { PK: `BUDGET#${panchayatId}`, SK: `YEAR#${year}`, panchayatId, year, allocations, updatedAt: new Date().toISOString() },
    }))
    return res.status(201).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save budget' })
  }
})

router.get('/:panchayatId', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.BUDGET,
      Key: { PK: `BUDGET#${req.params.panchayatId}`, SK: `YEAR#2026` },
    }))
    return res.json(result.Item || {})
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch budget' })
  }
})

export default router
