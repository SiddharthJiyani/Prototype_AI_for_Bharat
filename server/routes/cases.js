import { Router } from 'express'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/** POST /api/cases — file a new complaint */
router.post('/', async (req, res) => {
  try {
    const { userId, type, description, transcript, language, notice, panchayatId, lawCited, isSigned, signedAt, maskedAadhaar } = req.body
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
      lawCited: lawCited || null,
      isSigned: isSigned || false,
      signedAt: signedAt || null,
      maskedAadhaar: maskedAadhaar || null,
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

/** POST /api/cases/:id/dispatch-email — send signed legal notice by email, returns 65B metadata */
router.post('/:id/dispatch-email', async (req, res) => {
  try {
    const { id } = req.params
    const { respondentEmail, noticeText, isSigned, signedAt, maskedAadhaar, category, lawCited } = req.body

    if (!respondentEmail || !noticeText) {
      return res.status(400).json({ error: 'respondentEmail and noticeText are required' })
    }

    const sentAt = new Date().toISOString()
    const serverIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim()

    // Build email body
    const signatureBlock = isSigned
      ? `\n\n${'─'.repeat(60)}\nDIGITALLY SIGNED UNDER SECTION 5, INFORMATION TECHNOLOGY ACT 2000\nAadhaar (masked): ${maskedAadhaar}\nSigned At: ${new Date(signedAt).toLocaleString('en-IN')}\n${'─'.repeat(60)}`
      : ''

    const emailBody =
      `${noticeText}${signatureBlock}\n\n` +
      `${'─'.repeat(60)}\n` +
      `This legal notice has been served digitally via NyayMitra — IntegratedGov AI Platform.\n` +
      `Case ID: ${id}\n` +
      `Dispatched At: ${new Date(sentAt).toLocaleString('en-IN')}\n` +
      `Server IP: ${serverIp}\n` +
      `${'─'.repeat(60)}\n` +
      `Note: This dispatch record may be used in a Section 65B Evidence Act Certificate.`

    // Send via nodemailer (Gmail App Password)
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    })

    const info = await transporter.sendMail({
      from: `"NyayMitra Legal AI" <${process.env.MAIL_USER}>`,
      to: respondentEmail,
      subject: `Legal Notice — ${category || 'Legal Matter'} [Case: ${id}]`,
      text: emailBody,
    })

    // Update DynamoDB case record
    const { UpdateCommand: UC } = await import('@aws-sdk/lib-dynamodb')
    await dynamo.send(new (await import('@aws-sdk/lib-dynamodb')).UpdateCommand({
      TableName: TABLES.CASES,
      Key: { PK: `CASE#${id}`, SK: 'METADATA' },
      UpdateExpression: 'SET dispatchedAt = :da, respondentEmail = :re, #s = :st, updatedAt = :ua',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':da': sentAt,
        ':re': respondentEmail,
        ':st': 'In Progress',
        ':ua': sentAt,
      },
    }))

    return res.json({
      sentAt,
      messageId: info.messageId,
      serverIp,
      respondentEmail,
      caseId: id,
    })
  } catch (err) {
    console.error('[dispatch-email]', err)
    return res.status(500).json({ error: 'Failed to dispatch email: ' + err.message })
  }
})

export default router
