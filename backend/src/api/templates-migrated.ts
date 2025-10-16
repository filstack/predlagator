// backend/src/api/templates.ts - MIGRATED TO SUPABASE
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';

const router = Router();

// GET /api/templates - Список всех шаблонов
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query as any;
    const supabase = getSupabase();

    const { data: templates, error, count } = await supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    res.json({
      data: templates,
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

// GET /api/templates/:id - Получить шаблон
router.get('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates - Создать шаблон
router.post('/', async (req, res, next) => {
  try {
    const { name, content, description, mediaType, mediaUrl } = req.body;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        content,
        description,
        media_type: mediaType,
        media_url: mediaUrl,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
