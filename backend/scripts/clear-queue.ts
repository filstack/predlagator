/**
 * Очистка всех задач из pg-boss очереди
 */

import dotenv from 'dotenv';
dotenv.config();

import { getPgBoss } from '../src/queues/pg-boss-queue.js';
import { QUEUE_NAMES } from '../src/types/queue-jobs.js';

async function clearQueue() {
  const boss = await getPgBoss();

  console.log('🗑️  Clearing all queues...\n');

  const queues = [QUEUE_NAMES.START_CAMPAIGN, QUEUE_NAMES.SEND_MESSAGE];

  for (const queue of queues) {
    try {
      // Очистим все задачи в очереди
      await boss.deleteQueue(queue);
      console.log(`✅ Cleared queue: ${queue}`);
    } catch (error: any) {
      console.error(`❌ Error clearing ${queue}:`, error.message);
    }
  }

  console.log('\n✅ All queues cleared!');
  await boss.stop();
  process.exit(0);
}

clearQueue().catch(console.error);
