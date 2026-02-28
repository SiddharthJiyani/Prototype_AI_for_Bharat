import { Router } from 'express'
import { PutCommand, UpdateCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/**
 * POST /api/documents — save a new document session
 * Body: { userId, fileName, documentText, analyses, chatMessages }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, fileName, documentText, analyses, chatMessages } = req.body
    if (!userId || !fileName) {
      return res.status(400).json({ error: 'userId and fileName are required' })
    }

    const docId = `DOC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
    const now = new Date().toISOString()

    const item = {
      PK: `DOC#${docId}`,
      SK: 'METADATA',
      docId,
      userId,
      fileName,
      // Cap text at 100K chars to stay within DynamoDB 400KB item limit
      documentText: (documentText || '').slice(0, 100000),
      analyses: analyses || {},
      chatMessages: chatMessages || [],
      createdAt: now,
      updatedAt: now,
    }

    await dynamo.send(new PutCommand({ TableName: TABLES.CASES, Item: item }))
    return res.status(201).json({ docId, createdAt: now })
  } catch (err) {
    console.error('Save document error:', err)
    return res.status(500).json({ error: 'Failed to save document' })
  }
})

/**
 * GET /api/documents?userId=xxx — list documents for a user
 * Returns lightweight list without full text (for sidebar/history).
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId query param required' })

    const result = await dynamo.send(new ScanCommand({
      TableName: TABLES.CASES,
      FilterExpression: 'userId = :uid AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: { ':uid': userId, ':prefix': 'DOC#' },
      // Only return lightweight fields for the list view
      ProjectionExpression: 'docId, fileName, createdAt, updatedAt',
    }))

    const docs = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    return res.json({ documents: docs })
  } catch (err) {
    console.error('List documents error:', err)
    return res.status(500).json({ error: 'Failed to list documents' })
  }
})

/**
 * GET /api/documents/:docId — get full document session (text + analyses + chat)
 */
router.get('/:docId', async (req, res) => {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLES.CASES,
      Key: { PK: `DOC#${req.params.docId}`, SK: 'METADATA' },
    }))

    if (!result.Item) return res.status(404).json({ error: 'Document not found' })
    return res.json(result.Item)
  } catch (err) {
    console.error('Get document error:', err)
    return res.status(500).json({ error: 'Failed to get document' })
  }
})

/**
 * PUT /api/documents/:docId — update analyses / chat for existing document
 * Body: { analyses?, chatMessages? }
 */
router.put('/:docId', async (req, res) => {
  try {
    const { analyses, chatMessages } = req.body

    let updateExpr = 'SET updatedAt = :u'
    const exprValues = { ':u': new Date().toISOString() }

    if (analyses !== undefined) {
      updateExpr += ', analyses = :a'
      exprValues[':a'] = analyses
    }
    if (chatMessages !== undefined) {
      updateExpr += ', chatMessages = :c'
      exprValues[':c'] = chatMessages
    }

    await dynamo.send(new UpdateCommand({
      TableName: TABLES.CASES,
      Key: { PK: `DOC#${req.params.docId}`, SK: 'METADATA' },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: exprValues,
    }))

    return res.json({ success: true })
  } catch (err) {
    console.error('Update document error:', err)
    return res.status(500).json({ error: 'Failed to update document' })
  }
})

/**
 * DELETE /api/documents/:docId — remove a document from history
 */
router.delete('/:docId', async (req, res) => {
  try {
    await dynamo.send(new DeleteCommand({
      TableName: TABLES.CASES,
      Key: { PK: `DOC#${req.params.docId}`, SK: 'METADATA' },
    }))
    return res.json({ success: true })
  } catch (err) {
    console.error('Delete document error:', err)
    return res.status(500).json({ error: 'Failed to delete document' })
  }
})

export default router
