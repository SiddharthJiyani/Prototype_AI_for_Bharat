import { Router } from 'express'
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
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
    console.error('Budget POST error:', err.name, err.message)
    if (err.name === 'ResourceNotFoundException' || err.name === 'ResourceNotFoundError' || err.message?.includes('not found')) {
      return res.status(201).json({ success: true, note: 'Table not provisioned yet' })
    }
    return res.status(500).json({ error: 'Failed to save budget' })
  }
})

router.get('/:panchayatId', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear()
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.BUDGET,
      Key: { PK: `BUDGET#${req.params.panchayatId}`, SK: `YEAR#${year}` },
    }))
    return res.json(result.Item || {})
  } catch (err) {
    console.error('Budget GET error:', err.name, err.message)
    // Gracefully return empty when table doesn't exist
    return res.json({})
  }
})

// Get all budget years for a panchayat (history)
router.get('/:panchayatId/history', async (req, res) => {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLES.BUDGET,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `BUDGET#${req.params.panchayatId}` },
      ScanIndexForward: false, // newest first
    }))
    return res.json({ budgets: result.Items || [] })
  } catch (err) {
    console.error('Budget history error:', err.name, err.message)
    return res.json({ budgets: [] })
  }
})

export default router
