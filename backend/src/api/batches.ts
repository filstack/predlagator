// backend/src/api/batches.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { auditLoggerMiddleware } from '../middleware/audit-logger'
import {
  createBatchSchema,
  updateBatchSchema,
  batchQuerySchema,
} from '../../../shared/src/schemas/batch'

const router = Router()

// GET /api/batches - !?8A>: 2A5E 10BG59 A D8;LB@0<8
router.get('/', validate(batchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { search, createdById, page, limit, sortBy, sortOrder } = req.query as any

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (createdById) {
      where.createdById = createdById
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          _count: {
            select: {
              channels: true,
              campaigns: true,
            },
          },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.batch.count({ where }),
    ])

    res.json({
      data: batches,
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

// GET /api/batches/:id - >;CG8BL >48= 10BG
router.get('/:id', async (req, res, next) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        channels: {
          select: {
            id: true,
            username: true,
            category: true,
            title: true,
            memberCount: true,
            isActive: true,
          },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            progress: true,
            createdAt: true,
          },
        },
      },
    })

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' })
    }

    res.json(batch)
  } catch (error) {
    next(error)
  }
})

// POST /api/batches - !>740BL =>2K9 10BG
router.post(
  '/',
  validate(createBatchSchema, 'body'),
  auditLoggerMiddleware('BATCH_CREATED', 'Batch'),
  async (req, res, next) => {
    try {
      const { name, description, channelIds } = req.body

      // Get user ID from auth or use first available user
      let userId = (req as any).user?.id
      if (!userId) {
        const firstUser = await prisma.user.findFirst()
        if (!firstUser) {
          return res.status(400).json({ error: 'No users found in database' })
        }
        userId = firstUser.id
      }

      const batch = await prisma.batch.create({
        data: {
          name,
          description,
          createdById: userId,
          channelCount: channelIds?.length || 0,
          ...(channelIds && channelIds.length > 0
            ? {
                channels: {
                  connect: channelIds.map((id: string) => ({ id })),
                },
              }
            : {}),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
          channels: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      res.status(201).json(batch)
    } catch (error) {
      next(error)
    }
  }
)

// PATCH /api/batches/:id - 1=>28BL 10BG
router.patch(
  '/:id',
  validate(updateBatchSchema, 'body'),
  auditLoggerMiddleware('BATCH_UPDATED', 'Batch'),
  async (req, res, next) => {
    try {
      const { name, description, channelIds } = req.body

      // >43>B02;8205< 40==K5 4;O >1=>2;5=8O
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description

      // A;8 >1=>2;ONBAO :0=0;K
      if (channelIds) {
        updateData.channelCount = channelIds.length
        updateData.channels = {
          set: [], // !=0G0;0 >BA>548=O5< 2A5
          connect: channelIds.map((id: string) => ({ id })),
        }
      }

      const batch = await prisma.batch.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          channels: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      res.json(batch)
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /api/batches/:id - #40;8BL 10BG
router.delete('/:id', auditLoggerMiddleware('BATCH_DELETED', 'Batch'), async (req, res, next) => {
  try {
    await prisma.batch.delete({
      where: { id: req.params.id },
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router

