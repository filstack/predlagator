// backend/src/api/channels.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import {
  channelQuerySchema,
  createChannelSchema,
  updateChannelSchema,
} from '../../../shared/src/schemas/channel'

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
        { username: { contains: search } },
        { title: { contains: search } },
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

// POST /api/channels - Create new channel
router.post('/', validate(createChannelSchema, 'body'), async (req, res, next) => {
  try {
    const { username, category, tgstatUrl, title, description, memberCount, isVerified, collectedAt } = req.body

    const channel = await prisma.channel.create({
      data: {
        username,
        category,
        tgstatUrl,
        title,
        description,
        memberCount,
        isVerified: isVerified ?? false,
        collectedAt: collectedAt || new Date(),
        isActive: true,
        errorCount: 0,
      },
    })

    res.status(201).json(channel)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/channels/:id - Update channel
router.patch('/:id', validate(updateChannelSchema, 'body'), async (req, res, next) => {
  try {
    const updates = req.body

    const channel = await prisma.channel.update({
      where: { id: req.params.id },
      data: updates,
    })

    res.json(channel)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/channels/:id - Delete channel
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.channel.delete({
      where: { id: req.params.id },
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
