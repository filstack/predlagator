/**
 * Channels API Router
 * Feature: 004-manual-channel-management
 *
 * RESTful endpoints for channel management
 * Base path: /api/channels
 */

import { Router, Request, Response, NextFunction } from 'express';
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

export default router;
