import { Router } from 'express'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/** GET /api/schemes?query=xxx */
router.get('/', async (req, res) => {
  try {
    // TODO: replace with proper filter expression or Bedrock vector search
    const result = await dynamo.send(new ScanCommand({ TableName: TABLES.SCHEMES }))
    return res.json({ schemes: result.Items || [] })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch schemes' })
  }
})

export default router
