/**
 * Проверка состояния очереди pg-boss
 */

import dotenv from 'dotenv';
dotenv.config();

import { getPgBoss } from '../src/queues/pg-boss-queue.js';
import { QUEUE_NAMES } from '../src/types/queue-jobs.js';

async function checkQueue() {
  const boss = await getPgBoss();

  console.log('🔍 Checking pg-boss queue...\n');

  // Проверим количество задач в каждой очереди
  const queues = [QUEUE_NAMES.START_CAMPAIGN, QUEUE_NAMES.SEND_MESSAGE];

  for (const queue of queues) {
    const counts = await boss.getQueueSize(queue);
    console.log(`📊 Queue "${queue}":`, counts);
  }

  // Получим все задачи
  console.log('\n📋 Recent jobs:');

  try {
    // Проверим задачи start-campaign
    const startCampaignJobs = await boss.fetch(QUEUE_NAMES.START_CAMPAIGN, 10);
    console.log(`\n  start-campaign jobs:`, startCampaignJobs?.length || 0);
    if (startCampaignJobs && startCampaignJobs.length > 0) {
      startCampaignJobs.forEach(job => {
        console.log(`    - Job ID: ${job.id}, Campaign: ${job.data.campaignId}`);
      });
    }

    // Проверим задачи send-message
    const sendMessageJobs = await boss.fetch(QUEUE_NAMES.SEND_MESSAGE, 10);
    console.log(`\n  send-message jobs:`, sendMessageJobs?.length || 0);
    if (sendMessageJobs && sendMessageJobs.length > 0) {
      sendMessageJobs.forEach(job => {
        console.log(`    - Job ID: ${job.id}, Campaign: ${job.data.campaignId}, Channel: ${job.data.channelUsername}`);
      });
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
  }

  await boss.stop();
  process.exit(0);
}

checkQueue().catch(console.error);
