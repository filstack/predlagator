// backend/src/api/channels.ts - MIGRATED TO SUPABASE
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';

const router = Router();

// GET /api/channels - Список всех каналов
router.get('/', async (req, res, next) => {
  try {
    const { category, search, isActive, page = 1, limit = 50 } = req.query as any;
    const supabase = getSupabase();

    let query = supabase
      .from('channels')
      .select('*', { count: 'exact' });

    if (category) query = query.eq('category', category);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');
    if (search) query = query.or(`username.ilike.%${search}%,title.ilike.%${search}%`);

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: channels, error, count } = await query;

    if (error) throw error;

    res.json({
      data: channels,
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

// PATCH /api/channels/:id - Обновить канал (для error_count)
router.patch('/:id', async (req, res, next) => {
  try {
    const { isActive, errorCount } = req.body;
    const supabase = getSupabase();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (isActive !== undefined) updateData.is_active = isActive;
    if (errorCount !== undefined) updateData.error_count = errorCount;

    const { data, error } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
