import { Router } from 'express'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

/**
 * POST /api/auth/signup
 * Body: { name, email, password, phone }
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check if user already exists
    const existing = await dynamo.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { PK: `USER#${email}`, SK: 'PROFILE' } })
    )
    if (existing.Item) {
      return res.status(409).json({ error: 'User already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = email
    const now = new Date().toISOString()

    await dynamo.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
          userId,
          name,
          email,
          phone: phone || '',
          passwordHash,
          role: 'citizen',
          createdAt: now,
        },
      })
    )

    const token = jwt.sign(
      { userId, role: 'citizen', name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({ token, user: { userId, name, role: 'citizen' } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Signup failed' })
  }
})

/**
 * POST /api/auth/login
 * Body: { userId, password, role }
 */
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body
    if (!userId || !password) {
      return res.status(400).json({ error: 'userId and password required' })
    }

    const result = await dynamo.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } })
    )

    const user = result.Item
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { userId: user.userId, role: user.role, name: user.name, panchayatId: user.panchayatId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({ token, user: { userId: user.userId, name: user.name, role: user.role } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
router.get('/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    return res.json({ user: decoded })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
