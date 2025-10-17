// backend/src/api/campaigns.ts
import { Router } from 'express'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { auditLoggerMiddleware } from '../middleware/audit-logger'
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignActionSchema,
} from '../../../shared/src/schemas/campaign'
import { startCampaign, pauseCampaign, cancelCampaign } from '../queues/campaign-queue'

const router = Router()

// GET /api/campaigns - !?8A>: 2A5E :0<?0=89 A D8;LB@0<8
router.get('/', validate(campaignQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { status, mode, batchId, createdById, search, page, limit, sortBy, sortOrder } =
      req.query as any

    const where: any = {}

    if (status) where.status = status
    if (mode) where.mode = mode
    if (batchId) where.batchId = batchId
    if (createdById) where.createdById = createdById

    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }]
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              channelCount: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              jobs: true,
            },
          },
        },
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    res.json({
      data: campaigns,
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

// GET /api/campaigns/:id - >;CG8BL >4=C :0<?0=8N
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        batch: {
          include: {
            channels: {
              select: {
                id: true,
                username: true,
                category: true,
                isActive: true,
              },
            },
          },
        },
        template: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        jobs: {
          select: {
            id: true,
            channelId: true,
            status: true,
            attempts: true,
            errorMessage: true,
            createdAt: true,
            sentAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!campaign) {
      return res.status(404).json({ error: '0<?0=8O =5 =0945=0' })
    }

    res.json(campaign)
  } catch (error) {
    next(error)
  }
})

// GET /api/campaigns/:id/stats - >;CG8BL AB0B8AB8:C :0<?0=88
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await prisma.job.groupBy({
      by: ['status'],
      where: {
        campaignId: req.params.id,
      },
      _count: {
        status: true,
      },
    })

    const statsMap = stats.reduce(
      (acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status
        return acc
      },
      { queued: 0, sending: 0, sent: 0, failed: 0 }
    )

    res.json(statsMap)
  } catch (error) {
    next(error)
  }
})

// POST /api/campaigns - !>740BL =>2CN :0<?0=8N
router.post(
  '/',
  validate(createCampaignSchema, 'body'),
  auditLoggerMiddleware('CAMPAIGN_CREATED', 'Campaign'),
  async (req, res, next) => {
    try {
      const { name, description, batchId, templateId, params, mode, deliveryRate, retryLimit } =
        req.body
      // Get user ID from auth or use first available user
      let userId = (req as any).user?.id
      if (!userId) {
        const firstUser = await prisma.user.findFirst()
        if (!firstUser) {
          return res.status(400).json({ error: 'No users found in database' })
        }
        userId = firstUser.id
      }

      // >;CG05< :>;8G5AB2> :0=0;>2 2 10BG5
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          channels: {
            where: { isActive: true },
          },
        },
      })

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' })
      }

      const activeChannels = batch.channels

      // !>7405< :0<?0=8N
      const campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          batchId,
          templateId,
          params,
          mode,
          deliveryRate,
          retryLimit,
          status: 'QUEUED',
          progress: 0,
          totalJobs: activeChannels.length,
          createdById: userId,
        },
        include: {
          batch: true,
          template: true,
        },
      })

      // !>7405< jobs 4;O :064>3> 0:B82=>3> :0=0;0
      await prisma.job.createMany({
        data: activeChannels.map((channel) => ({
          campaignId: campaign.id,
          channelId: channel.id,
          status: 'QUEUED',
        })),
      })

      res.status(201).json(campaign)
    } catch (error) {
      next(error)
    }
  }
)

// PATCH /api/campaigns/:id - 1=>28BL :0<?0=8N
router.patch(
  '/:id',
  validate(updateCampaignSchema, 'body'),
  auditLoggerMiddleware('CAMPAIGN_STARTED', 'Campaign'),
  async (req, res, next) => {
    try {
      const { name, description, params, mode, deliveryRate, retryLimit } = req.body

      // @>25@O5<, GB> :0<?0=8O 5I5 =5 70?CI5=0
      const existing = await prisma.campaign.findUnique({
        where: { id: req.params.id },
      })

      if (!existing) {
        return res.status(404).json({ error: '0<?0=8O =5 =0945=0' })
      }

      if (existing.status !== 'QUEUED' && existing.status !== 'PAUSED') {
        return res.status(400).json({
          error: '52>7<>6=> 87<5=8BL :0<?0=8N',
          message: '>6=> @540:B8@>20BL B>;L:> :0<?0=88 2 AB0BCA5 QUEUED 8;8 PAUSED',
        })
      }

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (params !== undefined) updateData.params = params
      if (mode !== undefined) updateData.mode = mode
      if (deliveryRate !== undefined) updateData.deliveryRate = deliveryRate
      if (retryLimit !== undefined) updateData.retryLimit = retryLimit

      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data: updateData,
      })

      res.json(campaign)
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/campaigns/:id/action - #?@02;5=85 AB0BCA>< :0<?0=88 (start, pause, resume, cancel)
router.post(
  '/:id/action',
  validate(campaignActionSchema, 'body'),
  async (req, res, next) => {
    try {
      const { action } = req.body
      const campaignId = req.params.id

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      })

      if (!campaign) {
        return res.status(404).json({ error: '0<?0=8O =5 =0945=0' })
      }

      let newStatus: string
      let auditAction: string

      switch (action) {
        case 'start':
          if (campaign.status !== 'QUEUED') {
            return res.status(400).json({ error: '>6=> 70?CAB8BL B>;L:> :0<?0=8N 2 AB0BCA5 QUEUED' })
          }
          newStatus = 'RUNNING'
          auditAction = 'CAMPAIGN_STARTED'
          break

        case 'pause':
          if (campaign.status !== 'RUNNING') {
            return res.status(400).json({ error: '>6=> ?@8>AB0=>28BL B>;L:> 70?CI5==CN :0<?0=8N' })
          }
          newStatus = 'PAUSED'
          auditAction = 'CAMPAIGN_PAUSED'
          break

        case 'resume':
          if (campaign.status !== 'PAUSED') {
            return res.status(400).json({ error: '>6=> 2>7>1=>28BL B>;L:> ?@8>AB0=>2;5==CN :0<?0=8N' })
          }
          newStatus = 'RUNNING'
          auditAction = 'CAMPAIGN_RESUMED'
          break

        case 'cancel':
          if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
            return res.status(400).json({ error: '52>7<>6=> >B<5=8BL 7025@H5==CN :0<?0=8N' })
          }
          newStatus = 'CANCELLED'
          auditAction = 'CAMPAIGN_CANCELLED'
          break

        default:
          return res.status(400).json({ error: 'Unknown action' })
      }

      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: newStatus as any,
          startedAt: action === 'start' ? new Date() : campaign.startedAt,
          completedAt: action === 'cancel' ? new Date() : campaign.completedAt,
        },
      })

      // Respond immediately, queue operations are async (fire-and-forget)
      res.json(updated)

      // Queue integration (non-blocking)
      setImmediate(async () => {
        try {
          if (action === 'start') {
            // Add campaign to queue for processing
            await startCampaign(campaignId, (req as any).user?.id)
            console.log(`✅ Campaign ${campaignId} added to queue`)
          } else if (action === 'pause') {
            // Pause campaign processing
            await pauseCampaign(campaignId)
            console.log(`⏸️  Campaign ${campaignId} paused`)
          } else if (action === 'cancel') {
            // Cancel all campaign jobs
            await cancelCampaign(campaignId)
            console.log(`❌ Campaign ${campaignId} cancelled`)
          }
        } catch (queueError) {
          console.error('Queue operation error:', queueError)
          // TODO: Rollback status if queue fails
        }
      })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /api/campaigns/:id - #40;8BL :0<?0=8N
router.delete(
  '/:id',
  auditLoggerMiddleware('CAMPAIGN_CANCELLED', 'Campaign'),
  async (req, res, next) => {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
      })

      if (!campaign) {
        return res.status(404).json({ error: '0<?0=8O =5 =0945=0' })
      }

      if (campaign.status === 'RUNNING') {
        return res.status(400).json({
          error: '52>7<>6=> C40;8BL :0<?0=8N',
          message: '!=0G0;0 >AB0=>28B5 70?CI5==CN :0<?0=8N',
        })
      }

      // Jobs 1C4CB C40;5=K 02B><0B8G5A:8 1;03>40@O onDelete: Cascade
      await prisma.campaign.delete({
        where: { id: req.params.id },
      })

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
)

export default router

