import { Router } from 'express'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { panchayatId, subject, submittedBy, description, priority } = req.body
    const id = `AGR-2026-${Math.floor(100 + Math.random() * 900)}`
    const now = new Date().toISOString()
    await dynamo.send(new PutCommand({
      TableName: TABLES.GRIEVANCES,
      Item: { PK: `GRIEVANCE#${id}`, SK: 'METADATA', id, panchayatId, subject, submittedBy, description, priority, status: 'New', createdAt: now },
    }))
    return res.status(201).json({ id, status: 'New' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create grievance' })
  }
})

router.get('/:panchayatId', async (_req, res) => {
  // TODO: GSI query by panchayatId
  return res.json({ grievances: [] })
})

router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body
    await dynamo.send(new UpdateCommand({
      TableName: TABLES.GRIEVANCES,
      Key: { PK: `GRIEVANCE#${req.params.id}`, SK: 'METADATA' },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status },
    }))
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update grievance' })
  }
})

export default router
