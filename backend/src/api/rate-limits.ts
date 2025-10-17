// backend/src/api/rate-limits.ts
import { Router } from 'express'
import { rateLimitTracker } from '../services/rate-limit-tracker'

const router = Router()

/**
 * GET /api/rate-limits/stats - Получить статистику rate limits
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await rateLimitTracker.getStats()
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/rate-limits/active - Получить список активных блокировок
 */
router.get('/active', async (req, res, next) => {
  try {
    const blocks = await rateLimitTracker.getActiveBlocks()
    res.json(blocks)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/rate-limits/check/:key - Проверить статус конкретного ключа
 */
router.get('/check/:key', async (req, res, next) => {
  try {
    const { key } = req.params
    const blocked = await rateLimitTracker.isBlocked(key)
    const remaining = await rateLimitTracker.getRemainingWaitTime(key)

    res.json({
      key,
      isBlocked: !!blocked,
      blocked,
      remainingSeconds: remaining,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/rate-limits/:key - Снять блокировку вручную
 */
router.delete('/:key', async (req, res, next) => {
  try {
    const { key } = req.params
    await rateLimitTracker.clearBlock(key)
    res.json({ message: 'Блокировка снята' })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/rate-limits/cleanup - Очистить устаревшие блокировки
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const cleaned = await rateLimitTracker.cleanupExpired()
    res.json({ cleaned, message: `Очищено блокировок: ${cleaned}` })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/rate-limits/reset-stats - Сбросить статистику
 */
router.post('/reset-stats', async (req, res, next) => {
  try {
    await rateLimitTracker.resetStats()
    res.json({ message: 'Статистика сброшена' })
  } catch (error) {
    next(error)
  }
})

export default router
