import { Router } from 'express'
import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/**
 * POST /api/meetings
 * Save a generated MOM.
 * Body: { panchayatId, meetingDate, location, attendees, meetingType, transcript, minutes }
 */
router.post('/', async (req, res) => {
  try {
    const { panchayatId = 'default', meetingDate, location, attendees, meetingType, transcript, minutes } = req.body
    if (!minutes) return res.status(400).json({ error: 'minutes required' })

    const meetingId = uuidv4()
    const now = new Date().toISOString()

    await dynamo.send(new PutCommand({
      TableName: TABLES.MEETINGS,
      Item: {
        PK: `PANCHAYAT#${panchayatId}`,
        SK: `MEETING#${meetingDate || now.slice(0, 10)}#${meetingId}`,
        meetingId,
        panchayatId,
        meetingDate: meetingDate || now.slice(0, 10),
        location: location || '',
        attendees: attendees || 0,
        meetingType: meetingType || 'Gram Sabha',
        transcript: transcript || '',
        minutes,                   // full JSON object from AI
        createdAt: now,
      },
    }))

    res.json({ meetingId, createdAt: now })
  } catch (err) {
    console.error('Save meeting error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/meetings?panchayatId=xxx&limit=20
 * List all saved MOMs for a panchayat, newest first.
 */
router.get('/', async (req, res) => {
  try {
    const panchayatId = req.query.panchayatId || 'default'
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLES.MEETINGS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `PANCHAYAT#${panchayatId}`,
        ':prefix': 'MEETING#',
      },
      ScanIndexForward: false,   // newest first
      Limit: limit,
    }))

    // Return lightweight list (no full minutes blob)
    const items = (result.Items || []).map(({ meetingId, meetingDate, location, attendees, meetingType, createdAt, SK }) => ({
      meetingId,
      SK,
      meetingDate,
      location,
      attendees,
      meetingType,
      createdAt,
    }))

    res.json({ meetings: items })
  } catch (err) {
    console.error('List meetings error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/meetings/:panchayatId/:sk
 * Fetch a single MOM with full minutes + transcript.
 * SK must be URL-encoded.
 */
router.get('/:panchayatId/:sk', async (req, res) => {
  try {
    const { panchayatId, sk } = req.params
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.MEETINGS,
      Key: {
        PK: `PANCHAYAT#${panchayatId}`,
        SK: decodeURIComponent(sk),
      },
    }))

    if (!result.Item) return res.status(404).json({ error: 'Meeting not found' })
    res.json(result.Item)
  } catch (err) {
    console.error('Get meeting error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * DELETE /api/meetings/:panchayatId/:sk
 */
router.delete('/:panchayatId/:sk', async (req, res) => {
  try {
    const { panchayatId, sk } = req.params
    await dynamo.send(new DeleteCommand({
      TableName: TABLES.MEETINGS,
      Key: {
        PK: `PANCHAYAT#${panchayatId}`,
        SK: decodeURIComponent(sk),
      },
    }))
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete meeting error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
