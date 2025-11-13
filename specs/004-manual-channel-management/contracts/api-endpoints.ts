/**
 * API Endpoints Specification
 * Feature: 004-manual-channel-management
 *
 * RESTful API contract for channel management
 * Base URL: /api/channels
 */

import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ListChannelsQuery,
  ListChannelsResponse,
  CheckUsernameResponse,
  ApiError,
} from './channel-types';

/**
 * API Endpoints
 */
export const CHANNEL_ENDPOINTS = {
  /**
   * List all channels (paginated)
   * GET /api/channels
   *
   * Query Parameters: ListChannelsQuery
   * Response: 200 - ListChannelsResponse
   * Errors:
   *   - 401 Unauthorized (no auth)
   *   - 500 Server Error
   */
  LIST: '/api/channels',

  /**
   * Get single channel by ID
   * GET /api/channels/:id
   *
   * Path Parameters: id (UUID)
   * Response: 200 - Channel
   * Errors:
   *   - 404 Not Found
   *   - 401 Unauthorized
   *   - 403 Forbidden (not owner)
   */
  GET: '/api/channels/:id',

  /**
   * Create new channel
   * POST /api/channels
   *
   * Body: CreateChannelRequest
   * Response: 201 - Channel
   * Errors:
   *   - 400 Bad Request (validation error)
   *   - 409 Conflict (username already exists)
   *   - 401 Unauthorized
   */
  CREATE: '/api/channels',

  /**
   * Update existing channel
   * PUT /api/channels/:id
   *
   * Path Parameters: id (UUID)
   * Body: UpdateChannelRequest (includes updated_at for optimistic locking)
   * Response: 200 - Channel
   * Errors:
   *   - 400 Bad Request (validation error)
   *   - 404 Not Found
   *   - 409 Conflict (optimistic locking conflict OR username already exists)
   *   - 401 Unauthorized
   *   - 403 Forbidden (not owner)
   */
  UPDATE: '/api/channels/:id',

  /**
   * Delete channel
   * DELETE /api/channels/:id
   *
   * Path Parameters: id (UUID)
   * Response: 204 No Content
   * Errors:
   *   - 404 Not Found
   *   - 409 Conflict (channel used in active campaigns)
   *   - 401 Unauthorized
   *   - 403 Forbidden (not owner)
   */
  DELETE: '/api/channels/:id',

  /**
   * Check username availability
   * GET /api/channels/check-username/:username
   *
   * Path Parameters: username (string, e.g., @example)
   * Query Parameters: exclude_channel_id (UUID, optional - for edit mode)
   * Response: 200 - CheckUsernameResponse
   * Errors:
   *   - 400 Bad Request (invalid username format)
   *   - 401 Unauthorized
   */
  CHECK_USERNAME: '/api/channels/check-username/:username',
} as const;

/**
 * API Request Examples
 */

// Example: Create channel
export const CREATE_CHANNEL_EXAMPLE: CreateChannelRequest = {
  name: 'Новостной канал IT',
  username: '@tech_news_ru',
  title: 'IT Новости России',
  tgstat_url: 'https://tgstat.ru/channel/@tech_news_ru',
  telegram_links: [
    'https://t.me/tech_news_ru',
    'https://t.me/+Abcdef123456',
  ],
};

// Example: Update channel
export const UPDATE_CHANNEL_EXAMPLE: UpdateChannelRequest = {
  name: 'Обновлённое название',
  title: 'Новый заголовок',
  updated_at: '2025-10-18T10:30:00.000Z', // From current channel data
};

// Example: List channels query
export const LIST_CHANNELS_EXAMPLE: ListChannelsQuery = {
  page: 1,
  limit: 100,
  sort_by: 'created_at',
  sort_order: 'desc',
  status: 'active',
};

/**
 * API Response Examples
 */

// Example: Channel response
export const CHANNEL_RESPONSE_EXAMPLE: Channel = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Новостной канал IT',
  username: '@tech_news_ru',
  title: 'IT Новости России',
  tgstat_url: 'https://tgstat.ru/channel/@tech_news_ru',
  telegram_links: [
    'https://t.me/tech_news_ru',
    'https://t.me/+Abcdef123456',
  ],
  status: 'active',
  created_at: '2025-10-18T10:00:00.000Z',
  updated_at: '2025-10-18T10:30:00.000Z',
  author_created: '12345678-1234-1234-1234-123456789012',
  author_updated: '12345678-1234-1234-1234-123456789012',
  user_id: '12345678-1234-1234-1234-123456789012',
};

// Example: List response
export const LIST_RESPONSE_EXAMPLE: ListChannelsResponse = {
  data: [CHANNEL_RESPONSE_EXAMPLE],
  pagination: {
    page: 1,
    limit: 100,
    total: 250,
    total_pages: 3,
  },
};

// Example: Check username response (available)
export const CHECK_USERNAME_AVAILABLE: CheckUsernameResponse = {
  available: true,
};

// Example: Check username response (taken)
export const CHECK_USERNAME_TAKEN: CheckUsernameResponse = {
  available: false,
  message: 'Username @tech_news_ru already exists',
};

// Example: Validation error
export const VALIDATION_ERROR_EXAMPLE: ApiError = {
  error: {
    type: 'VALIDATION',
    message: 'Ошибка валидации данных',
    details: {
      type: 'VALIDATION',
      message: 'Validation failed',
      fields: {
        username: ['Username должен начинаться с @'],
        name: ['Название канала обязательно'],
      },
    },
  },
};

// Example: Optimistic locking conflict error
export const CONFLICT_ERROR_EXAMPLE: ApiError = {
  error: {
    type: 'CONFLICT',
    message: 'Канал был изменён другим пользователем',
    details: {
      type: 'CONFLICT',
      message: 'Channel was modified by another user',
      current_version: {
        updated_at: '2025-10-18T11:00:00.000Z',
        updated_by: 'user@example.com',
      },
      your_version: {
        updated_at: '2025-10-18T10:30:00.000Z',
      },
    },
  },
};
