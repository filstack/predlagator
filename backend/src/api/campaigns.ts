// backend/src/api/campaigns.ts
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { getPgBoss } from '../queues/pg-boss-queue';
import { QUEUE_NAMES } from '../types/queue-jobs';
import { getCampaignWithRelations, getCampaignStats, createJobsForCampaign } from '../lib/supabase-helpers';
import { validate } from '../middleware/validate';
import { auditLoggerMiddleware } from '../middleware/audit-logger';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema,
  campaignActionSchema,
} from '../../../shared/src/schemas/campaign';

const router = Router();

// GET /api/campaigns - Список всех кампаний с фильтрами
router.get('/', validate(campaignQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { status, mode, batchId, search, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query as any;
    const supabase = getSupabase();

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        batch:batches(id, name, channel_count),
        template:templates(id, name),
        created_by:users!campaigns_created_by_id_fkey(id, username)
      `, { count: 'exact' });

    // Фильтры
    if (status) query = query.eq('status', status);
    if (mode) query = query.eq('mode', mode);
    if (batchId) query = query.eq('batch_id', batchId);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    // Сортировка и пагинация
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: campaigns, error, count } = await query;

    if (error) throw error;

    res.json({
      data: campaigns,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/campaigns/:id - Получить одну кампанию
router.get('/:id', async (req, res, next) => {
  try {
    const { data: campaign, error } = await getCampaignWithRelations(req.params.id);

    if (error) throw error;
    if (!campaign) {
      return res.status(404).json({ error: 'Кампания не найдена' });
    }

    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// GET /api/campaigns/:id/stats - Получить статистику кампании
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await getCampaignStats(req.params.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// POST /api/campaigns - Создать новую кампанию
router.post(
  '/',
  validate(createCampaignSchema, 'body'),
  auditLoggerMiddleware('CAMPAIGN_CREATED', 'Campaign'),
  async (req, res, next) => {
    try {
      const { name, description, batchId, templateId, params, mode, deliveryRate, retryLimit } = req.body;
      const supabase = getSupabase();

      // Get user ID from auth or use first available user
      let userId = (req as any).user?.id;
      if (!userId) {
        const { data: firstUser } = await supabase.from('users').select('id').limit(1).single();
        if (!firstUser) {
          return res.status(400).json({ error: 'No users found in database' });
        }
        userId = firstUser.id;
      }

      // Получаем количество активных каналов в батче
      const { data: batchChannels, error: batchError } = await supabase
        .from('batch_channels')
        .select('channel:channels!inner(id, is_active)')
        .eq('batch_id', batchId)
        .eq('channels.is_active', true);

      if (batchError) throw batchError;

      const activeChannelCount = batchChannels?.length || 0;

      if (activeChannelCount === 0) {
        return res.status(400).json({ error: 'No active channels in batch' });
      }

      // Создаем кампанию
      const { data: campaign, error: createError } = await supabase
        .from('campaigns')
        .insert({
          name,
          description,
          batch_id: batchId,
          template_id: templateId,
          params,
          mode,
          delivery_rate: deliveryRate,
          retry_limit: retryLimit,
          status: 'QUEUED',
          progress: 0,
          total_jobs: activeChannelCount,
          created_by_id: userId,
        })
        .select(`
          *,
          batch:batches(*),
          template:templates(*)
        `)
        .single();

      if (createError) throw createError;

      // Создаем jobs для всех активных каналов
      const jobsCreated = await createJobsForCampaign(campaign.id, batchId);

      console.log(`✅ Campaign ${campaign.id} created with ${jobsCreated} jobs`);

      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/campaigns/:id - Обновить кампанию
router.patch(
  '/:id',
  validate(updateCampaignSchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, description, params, mode, deliveryRate, retryLimit } = req.body;
      const supabase = getSupabase();

      // Проверяем, что кампания еще не запущена
      const { data: existing, error: fetchError } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) {
        return res.status(404).json({ error: 'Кампания не найдена' });
      }

      if (existing.status !== 'QUEUED' && existing.status !== 'PAUSED') {
        return res.status(400).json({
          error: 'Невозможно изменить кампанию',
          message: 'Можно редактировать только кампании в статусе QUEUED или PAUSED',
        });
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (params !== undefined) updateData.params = params;
      if (mode !== undefined) updateData.mode = mode;
      if (deliveryRate !== undefined) updateData.delivery_rate = deliveryRate;
      if (retryLimit !== undefined) updateData.retry_limit = retryLimit;

      const { data: campaign, error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/campaigns/:id/action - Управление статусом кампании (start, pause, resume, cancel)
router.post(
  '/:id/action',
  validate(campaignActionSchema, 'body'),
  async (req, res, next) => {
    try {
      const { action } = req.body;
      const campaignId = req.params.id;
      const supabase = getSupabase();

      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;
      if (!campaign) {
        return res.status(404).json({ error: 'Кампания не найдена' });
      }

      let newStatus: string;
      let auditAction: string;
      const updateData: any = { updated_at: new Date().toISOString() };

      switch (action) {
        case 'start':
          if (campaign.status !== 'QUEUED') {
            return res.status(400).json({ error: 'Можно запустить только кампанию в статусе QUEUED' });
          }
          newStatus = 'RUNNING';
          auditAction = 'CAMPAIGN_STARTED';
          updateData.started_at = new Date().toISOString();
          break;

        case 'pause':
          if (campaign.status !== 'RUNNING') {
            return res.status(400).json({ error: 'Можно приостановить только запущенную кампанию' });
          }
          newStatus = 'PAUSED';
          auditAction = 'CAMPAIGN_PAUSED';
          break;

        case 'resume':
          if (campaign.status !== 'PAUSED') {
            return res.status(400).json({ error: 'Можно возобновить только приостановленную кампанию' });
          }
          newStatus = 'RUNNING';
          auditAction = 'CAMPAIGN_RESUMED';
          break;

        case 'cancel':
          if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Невозможно отменить завершенную кампанию' });
          }
          newStatus = 'CANCELLED';
          auditAction = 'CAMPAIGN_CANCELLED';
          updateData.completed_at = new Date().toISOString();
          break;

        default:
          return res.status(400).json({ error: 'Unknown action' });
      }

      updateData.status = newStatus;

      const { data: updated, error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Respond immediately
      res.json(updated);

      // Queue integration (non-blocking)
      setImmediate(async () => {
        try {
          if (action === 'start') {
            const boss = await getPgBoss();
            await boss.send(
              QUEUE_NAMES.START_CAMPAIGN,
              {
                campaignId,
                userId: (req as any).user?.id
              },
              {
                singletonKey: campaignId
              }
            );
            console.log(`✅ Campaign ${campaignId} added to pg-boss queue`);
          }
          // TODO: Implement pause/cancel logic
        } catch (queueError) {
          console.error('Queue operation error:', queueError);
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/campaigns/:id - Удалить кампанию
router.delete(
  '/:id',
  auditLoggerMiddleware('CAMPAIGN_CANCELLED', 'Campaign'),
  async (req, res, next) => {
    try {
      const supabase = getSupabase();

      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!campaign) {
        return res.status(404).json({ error: 'Кампания не найдена' });
      }

      if (campaign.status === 'RUNNING') {
        return res.status(400).json({
          error: 'Невозможно удалить кампанию',
          message: 'Сначала остановите запущенную кампанию',
        });
      }

      // Jobs будут удалены автоматически благодаря onDelete: Cascade
      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) throw deleteError;

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
