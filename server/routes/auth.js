import { Router } from 'express'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { dynamo, TABLES } from '../config/dynamodb.js'

const router = Router()

// ── Google OAuth Strategy ──
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(null, false, { message: 'No email from Google' })

          const name = profile.displayName || email.split('@')[0]
          const userId = email
          let existingUser = null

          // Try to find/create user in DynamoDB (gracefully handle missing table)
          try {
            const existing = await dynamo.send(
              new GetCommand({ TableName: TABLES.USERS, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } })
            )
            existingUser = existing.Item

            if (!existingUser) {
              // Auto-create account for Google users
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
                    phone: '',
                    googleId: profile.id,
                    avatar: profile.photos?.[0]?.value || '',
                    role: 'citizen',
                    createdAt: now,
                    provider: 'google',
                  },
                })
              )
            }
          } catch (dbErr) {
            // DynamoDB table may not exist yet — continue with Google profile data
            console.warn('DynamoDB lookup skipped:', dbErr.name || dbErr.message)
          }

          const user = existingUser || { userId, name, role: 'citizen' }
          return done(null, {
            userId: user.userId || userId,
            name: user.name || name,
            role: user.role || 'citizen',
            avatar: user.avatar || profile.photos?.[0]?.value || '',
          })
        } catch (err) {
          return done(err)
        }
      }
    )
  )
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled')
}

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

// ── Google OAuth Routes ──

/**
 * GET /api/auth/google
 * Redirects user to Google consent screen
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}))

/**
 * GET /api/auth/google/callback
 * Google redirects here after user consents.
 * Issues a JWT and redirects to the frontend with the token.
 */
router.get('/google/callback', (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err || !user) {
      console.error('Google auth failed:', err || info)
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`)
    }

    try {
      const token = jwt.sign(
        { userId: user.userId, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      const userData = encodeURIComponent(JSON.stringify({
        token,
        user: { userId: user.userId, name: user.name, role: user.role, avatar: user.avatar || '' },
      }))

      return res.redirect(`${clientUrl}/auth/google/callback?data=${userData}`)
    } catch (tokenErr) {
      console.error('Google callback JWT error:', tokenErr)
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`)
    }
  })(req, res, next)
})

export default router
