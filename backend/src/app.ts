// backend/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
import channelsRouter from './api/channels'

app.use('/api/channels', channelsRouter)

app.get('/api', (req, res) => {
  res.json({
    message: 'Telegram Broadcast API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      channels: 'GET /api/channels',
      channelById: 'GET /api/channels/:id',
      categories: 'GET /api/channels/meta/categories',
    },
  })
})

// Error handler middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err)
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

export default app
