// backend/src/api/index.ts
import { Router } from 'express'
import channelsRouter from './channels'
import batchesRouter from './batches'
import templatesRouter from './templates'
import campaignsRouter from './campaigns'
// import rateLimitsRouter from './rate-limits' // TODO: Migrate to pg-boss rate limiting
import testRouter from './test'
import authTelegramRouter from './auth-telegram'

const router = Router()

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Telegram Broadcast API - Predlagator',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      channels: '/api/channels',
      batches: '/api/batches',
      templates: '/api/templates',
      campaigns: '/api/campaigns',
      rateLimits: '/api/rate-limits',
      test: '/api/test',
      authTelegram: '/api/auth-telegram',
    },
  })
})

// Mount route modules
router.use('/channels', channelsRouter)
router.use('/batches', batchesRouter)
router.use('/templates', templatesRouter)
router.use('/campaigns', campaignsRouter)
// router.use('/rate-limits', rateLimitsRouter) // TODO: Migrate to pg-boss
router.use('/test', testRouter)
router.use('/auth-telegram', authTelegramRouter)

// TODO: Add auth routes when authentication is implemented
// router.use('/auth', authRouter)
// router.use('/users', usersRouter)

export default router
