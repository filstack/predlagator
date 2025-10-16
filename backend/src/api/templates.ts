// backend/src/api/templates.ts - MIGRATED TO SUPABASE
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
} from '../../../shared/src/schemas/template';

const router = Router();

// GET /api/templates - Список всех шаблонов с фильтрами
router.get('/', validate(templateQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { search, mediaType, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query as any;
    const supabase = getSupabase();

    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (mediaType) {
      query = query.eq('media_type', mediaType);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: templates, error, count } = await query;

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

// GET /api/templates/:id - Получить один шаблон
router.get('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    // Get template with related campaigns
    const { data: template, error } = await supabase
      .from('templates')
      .select(`
        *,
        campaigns:campaigns(id, name, status, created_at)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!template) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }

    // Limit campaigns to 10 most recent
    if (template.campaigns && template.campaigns.length > 10) {
      template.campaigns = template.campaigns
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates - Создать новый шаблон
router.post('/', validate(createTemplateSchema, 'body'), async (req, res, next) => {
  try {
    const { name, content, description, mediaType, mediaUrl } = req.body;
    const supabase = getSupabase();

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        name,
        content,
        description,
        media_type: mediaType || null,
        media_url: mediaUrl || null,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/templates/:id - Обновить шаблон
router.patch('/:id', validate(updateTemplateSchema, 'body'), async (req, res, next) => {
  try {
    const { name, content, description, mediaType, mediaUrl } = req.body;
    const supabase = getSupabase();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;
    if (mediaType !== undefined) updateData.media_type = mediaType;
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl;

    const { data: template, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/templates/:id - Удалить шаблон
router.delete('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    // Проверяем, используется ли шаблон в кампаниях
    const { count: campaignCount, error: countError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', req.params.id);

    if (countError) throw countError;

    if (campaignCount && campaignCount > 0) {
      return res.status(400).json({
        error: 'Невозможно удалить шаблон',
        message: `Шаблон используется в ${campaignCount} кампаниях`,
      });
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
