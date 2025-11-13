/**
 * Channel Service
 * Feature: 004-manual-channel-management
 *
 * Business logic for channel CRUD operations
 */

import { getSupabase } from '../lib/supabase';
import type {
  Channel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ListChannelsQuery,
  ListChannelsResponse,
  CheckUsernameResponse,
} from '../types/channel';

/**
 * Channel Service
 * All methods require userId for RLS filtering
 */
export class ChannelService {
  /**
   * Create a new channel
   */
  async createChannel(
    data: CreateChannelRequest,
    userId: string
  ): Promise<Channel> {
    const supabase = getSupabase();

    // Check username uniqueness
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('username', data.username)
      .maybeSingle();

    if (existingChannel) {
      throw new Error(`Username ${data.username} already exists`);
    }

    // Insert channel
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        name: data.name,
        username: data.username,
        title: data.title || null,
        tgstat_url: data.tgstat_url || null,
        telegram_links: data.telegram_links || [],
        user_id: userId,
        author_created: userId,
        author_updated: userId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create channel: ${error.message}`);
    }

    return channel as Channel;
  }

  /**
   * Get channel by ID
   */
  async getChannelById(channelId: string, userId: string): Promise<Channel | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .eq('user_id', userId) // RLS filtering
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get channel: ${error.message}`);
    }

    return data as Channel;
  }

  /**
   * List channels with pagination, sorting, and filtering
   */
  async listChannels(
    query: ListChannelsQuery,
    userId: string
  ): Promise<ListChannelsResponse> {
    const supabase = getSupabase();
    const page = query.page || 1;
    const limit = query.limit || 100;
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';

    // Build query
    let dbQuery = supabase
      .from('channels')
      .select('*', { count: 'exact' })
      .eq('user_id', userId); // RLS filtering

    // Filter by status
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    // Sorting
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    dbQuery = dbQuery.range(start, end);

    // Execute query
    const { data, error, count } = await dbQuery;

    if (error) {
      throw new Error(`Failed to list channels: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data || []) as Channel[],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Update channel with optimistic locking
   */
  async updateChannel(
    channelId: string,
    data: UpdateChannelRequest,
    userId: string
  ): Promise<Channel> {
    const supabase = getSupabase();

    // Step 1: Get current version
    const current = await this.getChannelById(channelId, userId);

    if (!current) {
      throw new Error('Channel not found');
    }

    // Step 2: Check optimistic locking
    const currentUpdatedAt = new Date(current.updated_at);
    const clientUpdatedAt = new Date(data.updated_at);

    if (currentUpdatedAt > clientUpdatedAt) {
      throw new Error('CONFLICT: Channel was modified by another user');
    }

    // Step 3: Check username uniqueness if username is being updated
    if (data.username && data.username !== current.username) {
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('username', data.username)
        .neq('id', channelId)
        .maybeSingle();

      if (existingChannel) {
        throw new Error(`Username ${data.username} already exists`);
      }
    }

    // Step 4: Update channel
    const updateData: any = {
      author_updated: userId,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.tgstat_url !== undefined) updateData.tgstat_url = data.tgstat_url;
    if (data.telegram_links !== undefined) updateData.telegram_links = data.telegram_links;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: updated, error } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', channelId)
      .eq('user_id', userId) // RLS
      .eq('updated_at', data.updated_at) // Atomic optimistic lock check
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update channel: ${error.message}`);
    }

    if (!updated) {
      throw new Error('CONFLICT: Channel was modified during update');
    }

    return updated as Channel;
  }

  /**
   * Delete channel
   * Check if channel is used in active campaigns first
   */
  async deleteChannel(channelId: string, userId: string): Promise<void> {
    const supabase = getSupabase();

    // Step 1: Check if channel exists
    const channel = await this.getChannelById(channelId, userId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Step 2: TODO - Check if channel is used in active campaigns
    // This requires campaigns table integration
    // For now, we'll allow deletion

    // Step 3: Delete channel
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)
      .eq('user_id', userId); // RLS

    if (error) {
      throw new Error(`Failed to delete channel: ${error.message}`);
    }
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(
    username: string,
    excludeChannelId?: string
  ): Promise<CheckUsernameResponse> {
    const supabase = getSupabase();
    let query = supabase
      .from('channels')
      .select('id')
      .eq('username', username);

    // Exclude current channel when editing
    if (excludeChannelId) {
      query = query.neq('id', excludeChannelId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to check username: ${error.message}`);
    }

    const available = !data;

    return {
      available,
      message: available ? undefined : `Username ${username} already exists`,
    };
  }
}

// Export singleton instance
export const channelService = new ChannelService();
