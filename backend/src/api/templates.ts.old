// backend/src/api/templates.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
} from '../../../shared/src/schemas/template'

const router = Router()

// GET /api/templates - !?8A>: 2A5E H01;>=>2 A D8;LB@0<8
router.get('/', validate(templateQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { search, mediaType, page, limit, sortBy, sortOrder } = req.query as any

    const where: any = {}

    if (search) {
      where.OR = [{ name: { contains: search } }, { content: { contains: search } }]
    }

    if (mediaType) {
      where.mediaType = mediaType
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        select: {
          id: true,
          name: true,
          content: true,
          description: true,
          mediaType: true,
          mediaUrl: true,
          usageCount: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.template.count({ where }),
    ])

    res.json({
      data: templates,
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

// GET /api/templates/:id - >;CG8BL >48= H01;>=
router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!template) {
      return res.status(404).json({ error: '(01;>= =5 =0945=' })
    }

    res.json(template)
  } catch (error) {
    next(error)
  }
})

// POST /api/templates - !>740BL =>2K9 H01;>=
router.post('/', validate(createTemplateSchema, 'body'), async (req, res, next) => {
  try {
    const { name, content, description, mediaType, mediaUrl } = req.body

    const template = await prisma.template.create({
      data: {
        name,
        content,
        description,
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
      },
    })

    res.status(201).json(template)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/templates/:id - 1=>28BL H01;>=
router.patch('/:id', validate(updateTemplateSchema, 'body'), async (req, res, next) => {
  try {
    const { name, content, description, mediaType, mediaUrl } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (description !== undefined) updateData.description = description
    if (mediaType !== undefined) updateData.mediaType = mediaType
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: updateData,
    })

    res.json(template)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/templates/:id - #40;8BL H01;>=
router.delete('/:id', async (req, res, next) => {
  try {
    // @>25@O5<, 8A?>;L7C5BAO ;8 H01;>= 2 :0<?0=8OE
    const campaignCount = await prisma.campaign.count({
      where: { templateId: req.params.id },
    })

    if (campaignCount > 0) {
      return res.status(400).json({
        error: '52>7<>6=> C40;8BL H01;>=',
        message: `(01;>= 8A?>;L7C5BAO 2 ${campaignCount} :0<?0=8OE`,
      })
    }

    await prisma.template.delete({
      where: { id: req.params.id },
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
