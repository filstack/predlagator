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
    // NOTE: pg-boss v9 doesn't support these options (v10+ only)
    // archiveCompletedAfterSeconds: 604800,
    // retentionDays: 30,
    // monitorStateIntervalSeconds: 60,
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
