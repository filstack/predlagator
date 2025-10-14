// backend/src/api/channels.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { channelQuerySchema } from '../../../shared/src/schemas/channel'

const router = Router()

// GET /api/channels - List all channels with filters
router.get('/', async (req, res, next) => {
  try {
    const query = channelQuerySchema.parse(req.query)
    const { category, search, isActive, page, limit } = query

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.channel.count({ where }),
    ])

    res.json({
      data: channels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/channels/:id - Get single channel
router.get('/:id', async (req, res, next) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    res.json(channel)
  } catch (error) {
    next(error)
  }
})

// GET /api/channels/categories - Get all unique categories
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = await prisma.channel.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    })

    res.json(
      categories.map((cat) => ({
        name: cat.category,
        count: cat._count.category,
      }))
    )
  } catch (error) {
    next(error)
  }
})

export default router
