// backend/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// CORS configuration (должен быть ПЕРЕД helmet)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CORS_ORIGIN,
].filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Security middleware (после CORS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Отключаем для dev
  })
)

// Body parsers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
import apiRouter from './api'
import { errorHandler, notFoundHandler } from './middleware/error-handler'

app.use('/api', apiRouter)

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
