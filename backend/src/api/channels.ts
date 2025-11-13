/**
 * Channels API Router
 * Feature: 004-manual-channel-management
 *
 * RESTful endpoints for channel management
 * Base path: /api/channels
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { channelService } from '../services/channel-service';
import { validate, validateMultiple } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createChannelSchema,
  updateChannelSchema,
  listChannelsQuerySchema,
  channelIdSchema,
  checkUsernameSchema,
} from '../types/channel-validation';
import { getSupabase } from '../lib/supabase';

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/x-ndjson' ||
        file.mimetype === 'application/jsonl' ||
        file.originalname.endsWith('.jsonl') ||
        file.originalname.endsWith('.ndjson')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSONL files are allowed'));
    }
  },
});

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/channels
 * List all channels (paginated)
 */
router.get(
  '/',
  validate(listChannelsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const query = req.query as any;
      const result = await channelService.listChannels(query, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/channels/check-username/:username
 * Check username availability
 */
router.get(
  '/check-username/:username',
  validate(checkUsernameSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      const excludeChannelId = req.query.exclude_channel_id as string | undefined;

      const result = await channelService.checkUsernameAvailability(
        username,
        excludeChannelId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/channels/:id
 * Get single channel by ID
 */
router.get(
  '/:id',
  validate(channelIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const channel = await channelService.getChannelById(id, userId);

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      res.status(200).json(channel);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/channels
 * Create new channel
 */
router.post(
  '/',
  validate(createChannelSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const channel = await channelService.createChannel(req.body, userId);

      res.status(201).json(channel);
    } catch (error) {
      // Handle username conflict
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            type: 'CONFLICT',
            message: error.message,
          },
        });
      }
      next(error);
    }
  }
);

/**
 * PUT /api/channels/:id
 * Update existing channel
 */
router.put(
  '/:id',
  validateMultiple({
    params: channelIdSchema,
    body: updateChannelSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const channel = await channelService.updateChannel(id, req.body, userId);

      res.status(200).json(channel);
    } catch (error) {
      // Handle optimistic locking conflict
      if (error instanceof Error && error.message.includes('CONFLICT')) {
        return res.status(409).json({
          error: {
            type: 'CONFLICT',
            message: error.message,
          },
        });
      }

      // Handle username conflict
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            type: 'CONFLICT',
            message: error.message,
          },
        });
      }

      // Handle not found
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      next(error);
    }
  }
);

/**
 * DELETE /api/channels/:id
 * Delete channel
 */
router.delete(
  '/:id',
  validate(channelIdSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      await channelService.deleteChannel(id, userId);

      res.status(204).send();
    } catch (error) {
      // Handle not found
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      // Handle conflict (channel used in campaigns)
      if (error instanceof Error && error.message.includes('used in')) {
        return res.status(409).json({
          error: {
            type: 'CONFLICT',
            message: error.message,
          },
        });
      }

      next(error);
    }
  }
);

/**
 * POST /api/channels/import
 * Import channels from JSONL file
 */
router.post(
  '/import',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      console.log('📥 Import started by user:', userId);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('📄 File received:', req.file.originalname, 'Size:', req.file.size);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorMessages: string[] = [];

      // Parse NDJSON: split by actual newlines, not escaped ones
      const fileContent = req.file.buffer.toString('utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      console.log(`📋 Found ${lines.length} lines in file\n`);

      for (const line of lines) {
        try {
          // Parse JSON line
          const record = JSON.parse(line);
          console.log('🔄 Processing:', record.username || 'unknown');

          // Skip records without successful scraping
          if (record.status !== 'success' || !record.scraped_content) {
            skipped++;
            console.log('  ⏭ Skipped: no successful scraping data');
            continue;
          }

          // Пропускаем записи без username
          if (!record.username || record.username === 'unknown') {
            skipped++;
            console.log('  ⏭ Skipped: no username');
            continue;
          }

          // Parse scraped content if present
          let scrapedData = null;
          if (record.scraped_content) {
            try {
              scrapedData = JSON.parse(record.scraped_content);
            } catch (e) {
              console.error('  ⚠️  Failed to parse scraped_content:', e);
              skipped++;
              continue;
            }
          }

          // Parse subscribers (remove spaces and convert to number)
          const subscribersStr = scrapedData?.subscribers?.replace(/\s/g, '') || '0';
          const subscribers = parseInt(subscribersStr, 10) || 0;

          // Extract data from record and scraped content
          const username = record.username.startsWith('@') ? record.username : `@${record.username}`;
          const title = scrapedData?.title || null;
          const description = scrapedData?.description || null;
          const name = title || record.category || username; // Use title or category as name
          const tgstat_url = record.tgstat_url || null;
          const telegram_links = scrapedData?.telegram_links || [];
          const category = record.category || 'uncategorized';
          const rkn_registered = scrapedData?.rkn_registered || false;
          const collected_at = record.collected_at || null;
          const scraped_at = record.scraped_at || scrapedData?.extracted_at || null;

          // Check if channel exists (by username and user_id)
          const supabase = getSupabase();
          const { data: existing } = await supabase
            .from('channels')
            .select('id, updated_at')
            .eq('username', username)
            .eq('user_id', userId)
            .single();

          if (existing) {
            // Update existing channel
            console.log('  ↻ Updating existing channel:', username);
            const { error } = await supabase
              .from('channels')
              .update({
                name,
                title,
                description,
                tgstat_url,
                telegram_links,
                category,
                subscribers,
                rkn_registered,
                collected_at,
                scraped_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (error) {
              console.error('  ✗ Update error:', error);
              errors++;
              errorMessages.push(`Error updating ${username}: ${error.message}`);
            } else {
              console.log('  ✓ Updated:', username);
              updated++;
            }
          } else {
            // Create new channel
            console.log('  + Creating new channel:', username);
            const { error } = await supabase
              .from('channels')
              .insert({
                user_id: userId,
                name,
                username,
                title,
                description,
                tgstat_url,
                telegram_links,
                category,
                subscribers,
                rkn_registered,
                collected_at,
                scraped_at,
                status: 'active',
              });

            if (error) {
              console.error('  ✗ Insert error:', error);
              errors++;
              errorMessages.push(`Error importing ${username}: ${error.message}`);
            } else {
              console.log('  ✓ Imported:', username);
              imported++;
            }
          }
        } catch (error: any) {
          console.error('  ✗ Line processing error:', error.message);
          console.error('  Line preview:', line.substring(0, 100) + '...');
          errors++;
          const errorMsg = `Error processing line: ${error.message}`;
          if (!errorMessages.includes(errorMsg)) {
            errorMessages.push(errorMsg);
          }
        }
      }

      console.log('✅ Import completed:', { imported, updated, skipped, errors });

      res.status(200).json({
        success: true,
        stats: {
          imported,
          updated,
          skipped,
          errors,
        },
        errorMessages: errorMessages.slice(0, 10), // Return first 10 errors
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
