// backend/src/api/channels.ts - MIGRATED TO SUPABASE
import { Router } from 'express';
import { getSupabase } from '../lib/supabase';
import { validate } from '../middleware/validate';
import {
  channelQuerySchema,
  createChannelSchema,
  updateChannelSchema,
} from '../../../shared/src/schemas/channel';

const router = Router();

// GET /api/channels - List all channels with filters
router.get('/', async (req, res, next) => {
  try {
    const query = channelQuerySchema.parse(req.query);
    const { category, search, isActive, page, limit } = query;
    const supabase = getSupabase();

    let dbQuery = supabase
      .from('channels')
      .select('*', { count: 'exact' });

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    if (search) {
      dbQuery = dbQuery.or(`username.ilike.%${search}%,title.ilike.%${search}%`);
    }

    if (isActive !== undefined) {
      dbQuery = dbQuery.eq('is_active', isActive);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: channels, error, count } = await dbQuery;

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

// GET /api/channels/:id - Get single channel
router.get('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    const { data: channel, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// GET /api/channels/meta/categories - Get all unique categories
router.get('/meta/categories', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    // Supabase doesn't have groupBy, so we'll fetch all categories and group manually
    const { data: channels, error } = await supabase
      .from('channels')
      .select('category');

    if (error) throw error;

    // Group by category and count
    const categoryMap = new Map<string, number>();
    channels?.forEach((ch) => {
      const count = categoryMap.get(ch.category) || 0;
      categoryMap.set(ch.category, count + 1);
    });

    // Convert to array and sort by count
    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/channels - Create new channel
router.post('/', validate(createChannelSchema, 'body'), async (req, res, next) => {
  try {
    const { username, category, tgstatUrl, title, description, memberCount, isVerified, collectedAt } = req.body;
    const supabase = getSupabase();

    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        username,
        category,
        tgstat_url: tgstatUrl,
        title,
        description,
        member_count: memberCount,
        is_verified: isVerified ?? false,
        collected_at: collectedAt || new Date().toISOString(),
        is_active: true,
        error_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(channel);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/channels/:id - Update channel
router.patch('/:id', validate(updateChannelSchema, 'body'), async (req, res, next) => {
  try {
    const updates = req.body;
    const supabase = getSupabase();

    // Convert camelCase to snake_case for Supabase
    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.tgstatUrl !== undefined) updateData.tgstat_url = updates.tgstatUrl;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.memberCount !== undefined) updateData.member_count = updates.memberCount;
    if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.errorCount !== undefined) updateData.error_count = updates.errorCount;

    const { data: channel, error } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(channel);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/channels/:id - Delete channel
router.delete('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
