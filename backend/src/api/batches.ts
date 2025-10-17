// backend/src/api/batches.ts
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { validate } from '../middleware/validate';
import { auditLoggerMiddleware } from '../middleware/audit-logger';
import {
  createBatchSchema,
  updateBatchSchema,
  batchQuerySchema,
} from '../../../shared/src/schemas/batch';

const router = Router();

// GET /api/batches - Список всех батчей с фильтрами
router.get('/', validate(batchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query as any;
    const supabase = getSupabase();

    let query = supabase
      .from('batches')
      .select(`
        *,
        created_by:users!batches_created_by_id_fkey(id, username, role)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: batches, error, count } = await query;

    if (error) throw error;

    res.json({
      data: batches,
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

// GET /api/batches/:id - Получить один батч
router.get('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    const { data: batch, error } = await supabase
      .from('batches')
      .select(`
        *,
        created_by:users!batches_created_by_id_fkey(id, username, role),
        channels:batch_channels(
          channel:channels(id, username, category, title, member_count, is_active)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Преобразуем структуру для обратной совместимости
    const formattedBatch = {
      ...batch,
      channels: batch.channels?.map((bc: any) => bc.channel) || []
    };

    res.json(formattedBatch);
  } catch (error) {
    next(error);
  }
});

// POST /api/batches - Создать новый батч
router.post(
  '/',
  validate(createBatchSchema, 'body'),
  auditLoggerMiddleware('BATCH_CREATED', 'Batch'),
  async (req, res, next) => {
    try {
      const { name, description, channelIds } = req.body;
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

      // Создаем батч
      const { data: batch, error: createError } = await supabase
        .from('batches')
        .insert({
          name,
          description,
          created_by_id: userId,
          channel_count: channelIds?.length || 0,
        })
        .select(`
          *,
          created_by:users!batches_created_by_id_fkey(id, username)
        `)
        .single();

      if (createError) throw createError;

      // Связываем каналы если они есть
      if (channelIds && channelIds.length > 0) {
        const batchChannelsData = channelIds.map((channelId: string) => ({
          batch_id: batch.id,
          channel_id: channelId
        }));

        const { error: linkError } = await supabase
          .from('batch_channels')
          .insert(batchChannelsData);

        if (linkError) throw linkError;

        // Получаем связанные каналы
        const { data: channels } = await supabase
          .from('batch_channels')
          .select('channel:channels(id, username)')
          .eq('batch_id', batch.id);

        batch.channels = channels?.map((bc: any) => bc.channel) || [];
      }

      res.status(201).json(batch);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/batches/:id - Обновить батч
router.patch(
  '/:id',
  validate(updateBatchSchema, 'body'),
  auditLoggerMiddleware('BATCH_UPDATED', 'Batch'),
  async (req, res, next) => {
    try {
      const { name, description, channelIds } = req.body;
      const supabase = getSupabase();

      const updateData: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (channelIds !== undefined) updateData.channel_count = channelIds.length;

      const { data: batch, error: updateError } = await supabase
        .from('batches')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Если обновляются каналы
      if (channelIds) {
        // Удаляем старые связи
        await supabase
          .from('batch_channels')
          .delete()
          .eq('batch_id', req.params.id);

        // Создаем новые связи
        if (channelIds.length > 0) {
          const batchChannelsData = channelIds.map((channelId: string) => ({
            batch_id: req.params.id,
            channel_id: channelId
          }));

          await supabase
            .from('batch_channels')
            .insert(batchChannelsData);
        }

        // Получаем обновленные каналы
        const { data: channels } = await supabase
          .from('batch_channels')
          .select('channel:channels(id, username)')
          .eq('batch_id', req.params.id);

        batch.channels = channels?.map((bc: any) => bc.channel) || [];
      }

      res.json(batch);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/batches/:id - Удалить батч
router.delete('/:id', auditLoggerMiddleware('BATCH_DELETED', 'Batch'), async (req, res, next) => {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
