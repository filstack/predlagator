/**
 * Channel Entity Types
 * Feature: 004-manual-channel-management
 *
 * Shared types for Channel entity across backend and frontend
 */

/**
 * Channel entity from database
 * Matches channels table schema (snake_case)
 */
export interface Channel {
  id: string; // UUID
  name: string; // VARCHAR(255), required
  username: string; // VARCHAR(100), required, unique
  title: string | null; // VARCHAR(255), optional
  tgstat_url: string | null; // VARCHAR(2048), optional
  telegram_links: string[]; // TEXT[], array of URLs
  status: ChannelStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp (for optimistic locking)
  author_created: string | null; // UUID, FK to auth.users
  author_updated: string | null; // UUID, FK to auth.users
  user_id: string; // UUID, FK to auth.users, owner
}

/**
 * Channel status enum
 */
export type ChannelStatus = 'active' | 'inactive';

/**
 * Channel create payload (client → server)
 * Excludes auto-generated fields
 */
export interface CreateChannelRequest {
  name: string;
  username: string; // Must start with @
  title?: string | null;
  tgstat_url?: string | null;
  telegram_links?: string[]; // Array of URLs
}

/**
 * Channel update payload (client → server)
 * Includes updated_at for optimistic locking
 */
export interface UpdateChannelRequest {
  name?: string;
  username?: string;
  title?: string | null;
  tgstat_url?: string | null;
  telegram_links?: string[];
  status?: ChannelStatus;
  updated_at: string; // Required for optimistic locking check
}

/**
 * Channel response (server → client)
 * Same as Channel, but can be extended with computed fields
 */
export type ChannelResponse = Channel;

/**
 * Channel list query parameters
 */
export interface ListChannelsQuery {
  page?: number; // Default: 1
  limit?: number; // Default: 100, max: 1000
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'username';
  sort_order?: 'asc' | 'desc'; // Default: desc
  status?: ChannelStatus; // Filter by status
}

/**
 * Paginated channel list response
 */
export interface ListChannelsResponse {
  data: ChannelResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number; // Total count of channels (for pagination UI)
    total_pages: number;
  };
}

/**
 * Username uniqueness check response
 */
export interface CheckUsernameResponse {
  available: boolean;
  message?: string; // e.g., "Username @example already exists"
}

/**
 * Optimistic locking conflict error details
 */
export interface ConflictError {
  type: 'CONFLICT';
  message: string;
  current_version: {
    updated_at: string;
    updated_by: string | null; // Username or email of user who modified
  };
  your_version: {
    updated_at: string;
  };
}

/**
 * Channel validation error details
 */
export interface ValidationError {
  type: 'VALIDATION';
  message: string;
  fields: Record<string, string[]>; // field → array of error messages
}

/**
 * Generic API error response
 */
export interface ApiError {
  error: {
    type: 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'NETWORK' | 'UNAUTHORIZED' | 'SERVER_ERROR';
    message: string;
    details?: ConflictError | ValidationError | Record<string, any>;
  };
}
