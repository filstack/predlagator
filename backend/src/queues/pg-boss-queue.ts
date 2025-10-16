/**
 * pg-boss Queue Initialization
 * PostgreSQL-based job queue (replaces BullMQ/Redis)
 */

import PgBoss from 'pg-boss';

let bossInstance: PgBoss | null = null;

/**
 * Get or create pg-boss instance (singleton)
 */
export async function getPgBoss(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance;
  }

  const connectionString = process.env.SUPABASE_DIRECT_URL;

  if (!connectionString) {
    throw new Error('Missing SUPABASE_DIRECT_URL environment variable');
  }

  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss', // Separate schema for pg-boss tables
    max: 5, // Connection pool size
    ssl: {
      rejectUnauthorized: false, // Accept Supabase self-signed certificates
    },
    archiveCompletedAfterSeconds: 604800, // 7 days
    retentionDays: 30, // Delete archived jobs after 30 days
    monitorStateIntervalSeconds: 60, // Monitor queue health every 60s
  });

  // Error handling
  boss.on('error', (error) => {
    console.error('❌ pg-boss error:', error);
  });

  // Queue monitoring
  boss.on('monitor-states', (stats) => {
    console.log('📊 Queue stats:', {
      queues: stats.queues,
      created: stats.created,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
    });
  });

  // Start pg-boss
  await boss.start();
  console.log('✅ pg-boss started');

  bossInstance = boss;
  return boss;
}

/**
 * Graceful shutdown
 */
export async function closePgBoss() {
  if (bossInstance) {
    await bossInstance.stop();
    bossInstance = null;
    console.log('✅ pg-boss stopped');
  }
}
