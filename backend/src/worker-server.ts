/**
 * Worker Server Entry Point
 * Starts pg-boss and registers all workers
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

import { getPgBoss, closePgBoss } from './queues/pg-boss-queue';
import { getSupabase } from './lib/supabase';

async function startWorkers() {
  try {
    console.log('🚀 Starting worker server...');

    // Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    console.log('✅ Supabase connected');

    // Initialize pg-boss
    const boss = await getPgBoss();

    // Register workers
    const { createCampaignWorker } = await import('./workers/campaign-worker');
    const { createMessageWorker } = await import('./workers/message-worker');

    await createCampaignWorker(boss);
    await createMessageWorker(boss);

    console.log('🚀 All workers started');

    // Graceful shutdown handlers
    const shutdown = async () => {
      console.log('📴 Shutting down workers...');
      await closePgBoss();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    process.exit(1);
  }
}

startWorkers();
