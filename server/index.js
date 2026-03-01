import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import passport from 'passport'

import authRoutes from './routes/auth.js'
import casesRoutes from './routes/cases.js'
import documentsRoutes from './routes/documents.js'
import grievancesRoutes from './routes/grievances.js'
import budgetRoutes from './routes/budget.js'
import schemesRoutes from './routes/schemes.js'
import ecourtRoutes from './routes/ecourt.js'
import integrationRoutes from './routes/integration.js'
import voiceRoutes from './routes/voice.js'
import meetingsRoutes from './routes/meetings.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(morgan('dev'))
app.use(passport.initialize())

// Routes
app.use('/api/auth', authRoutes)
// Google OAuth callback lives at /auth/google/callback (matches GOOGLE_CALLBACK_URL)
app.use('/auth', authRoutes)
app.use('/api/cases', casesRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/grievances', grievancesRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/schemes', schemesRoutes)
app.use('/api/ecourts', ecourtRoutes)
app.use('/api/integration', integrationRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/meetings', meetingsRoutes)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'integatedgov-server' }))

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 IntegratedGov Server running on http://localhost:${PORT}`)
})
