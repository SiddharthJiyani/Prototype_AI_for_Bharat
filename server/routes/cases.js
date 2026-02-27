import { Router } from 'express'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/** POST /api/cases — file a new complaint */
router.post('/', async (req, res) => {
  try {
    const { userId, type, description, transcript, language, notice, panchayatId } = req.body
    const caseId = `LC-2026-${Math.floor(10000 + Math.random() * 90000)}`
    const now = new Date().toISOString()

    const item = {
      PK: `CASE#${caseId}`,
      SK: 'METADATA',
      caseId,
      userId,
      type,
      description,
      transcript,
      language,
      notice,
      panchayatId,
      status: 'Filed',
      createdAt: now,
      updatedAt: now,
    }

    await dynamo.send(new PutCommand({ TableName: TABLES.CASES, Item: item }))
    return res.status(201).json({ caseId, status: 'Filed', createdAt: now })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to file case' })
  }
})

/** GET /api/cases/:caseIdOrUserId — get specific case or list by user */
router.get('/:idParam', async (req, res) => {
  try {
    const { idParam } = req.params
    const userId = req.query.userId

    // If userId query param, list cases for that user (scan approach for MVP)
    if (userId) {
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
      const result = await dynamo.send(new ScanCommand({
        TableName: TABLES.CASES,
        FilterExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }))
      return res.json({ cases: result.Items || [] })
    }

    // Otherwise fetch single case by caseId
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb')
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.CASES,
      Key: { PK: `CASE#${idParam}`, SK: 'METADATA' },
    }))

    if (!result.Item) {
      return res.status(404).json({ error: 'Case not found' })
    }

    return res.json(result.Item)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch cases' })
  }
})

/** PATCH /api/cases/:id/status */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    await dynamo.send(new UpdateCommand({
      TableName: TABLES.CASES,
      Key: { PK: `CASE#${req.params.id}`, SK: 'METADATA' },
      UpdateExpression: 'SET #s = :s, updatedAt = :u',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status, ':u': new Date().toISOString() },
    }))
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status' })
  }
})

/** POST /api/cases/:id/timeline — add timeline event */
router.post('/:id/timeline', async (req, res) => {
  try {
    const { description, eventType } = req.body
    const eventId = `EVT${Date.now()}`
    
    await dynamo.send(new PutCommand({
      TableName: TABLES.CASES,
      Item: {
        PK: `CASE#${req.params.id}`,
        SK: `EVENT#${eventId}`,
        eventId,
        description,
        eventType,
        createdAt: new Date().toISOString(),
      },
    }))
    
    return res.status(201).json({ eventId, success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to add timeline event' })
  }
})

export default router
