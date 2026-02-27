import { Router } from 'express'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

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

export default router
