/**
 * Channel Types (Frontend)
 * Feature: 004-manual-channel-management
 *
 * Imported from backend contracts
 */

export interface Channel {
  id: string; // UUID
  name: string;
  username: string;
  title: string | null;
  tgstat_url: string | null;
  telegram_links: string[];
  status: ChannelStatus;
  created_at: string;
  updated_at: string;
  author_created: string | null;
  author_updated: string | null;
  user_id: string;
}

export type ChannelStatus = 'active' | 'inactive';

export interface CreateChannelRequest {
  name: string;
  username: string;
  title?: string | null;
  tgstat_url?: string | null;
  telegram_links?: string[];
}

export interface UpdateChannelRequest {
  name?: string;
  username?: string;
  title?: string | null;
  tgstat_url?: string | null;
  telegram_links?: string[];
  status?: ChannelStatus;
  updated_at: string; // Required for optimistic locking
}

export interface ListChannelsQuery {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'username';
  sort_order?: 'asc' | 'desc';
  status?: ChannelStatus;
}

export interface ListChannelsResponse {
  data: Channel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CheckUsernameResponse {
  available: boolean;
  message?: string;
}

export interface ApiError {
  error: {
    type: 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'NETWORK' | 'UNAUTHORIZED' | 'SERVER_ERROR';
    message: string;
    details?: any;
  };
}
