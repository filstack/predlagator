// backend/src/queues/campaign-queue.ts
import { Queue, QueueEvents } from 'bullmq'
import { redisConnection } from '../lib/redis'

// =B5@D59A 40==KE 4;O 46>10 >B?@02:8 A>>1I5=8O
export interface SendMessageJobData {
  jobId: string // ID 87 Prisma Job
  campaignId: string
  channelId: string
  channelUsername: string
  templateContent: string
  mediaType?: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | null
  mediaUrl?: string | null
  attempt: number
}

// =B5@D59A 40==KE 4;O 46>10 70?CA:0 :0<?0=88
export interface StartCampaignJobData {
  campaignId: string
  userId?: string
}

// !>740Q< >G5@54L 4;O >B?@02:8 A>>1I5=89
export const messageQueue = new Queue<SendMessageJobData>('message-sending', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // >;8G5AB2> ?>?KB>: ?@8 >H81:5
    backoff: {
      type: 'exponential',
      delay: 5000, // 0G0;L=0O 7045@6:0 5 A5:C=4
    },
    removeOnComplete: {
      count: 100, // %@0=8BL ?>A;54=85 100 2K?>;=5==KE 46>1>2
      age: 3600 * 24, // #40;OBL 46>1K AB0@H5 24 G0A>2
    },
    removeOnFail: {
      count: 500, // %@0=8BL ?>A;54=85 500 =5C40G=KE 46>1>2
    },
  },
})

// G5@54L 4;O C?@02;5=8O :0<?0=8O<8
export const campaignQueue = new Queue<StartCampaignJobData>('campaign-management', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // 5 ?>2B>@O5< C?@02;ONI85 :><0=4K
    removeOnComplete: {
      count: 50,
      age: 3600 * 24,
    },
  },
})

// !>1KB8O >G5@5459 4;O <>=8B>@8=30
export const messageQueueEvents = new QueueEvents('message-sending', {
  connection: redisConnection,
})

export const campaignQueueEvents = new QueueEvents('campaign-management', {
  connection: redisConnection,
})

// !;CH0B5;8 A>1KB89 4;O ;>38@>20=8O
messageQueueEvents.on('completed', ({ jobId }) => {
  console.log(` 6>1 ${jobId} 2K?>;=5= CA?5H=>`)
})

messageQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`L 6>1 ${jobId} ?@>20;5=: ${failedReason}`)
})

messageQueueEvents.on('progress', ({ jobId, data }) => {
  console.log(`ó @>3@5AA 46>10 ${jobId}:`, data)
})

campaignQueueEvents.on('completed', ({ jobId }) => {
  console.log(` 0<?0=8O ${jobId} 70?CI5=0`)
})

// $C=:F8O 4;O 4>102;5=8O 46>10 >B?@02:8 A>>1I5=8O
export async function addSendMessageJob(data: SendMessageJobData, delay?: number) {
  const job = await messageQueue.add(
    'send-message',
    data,
    {
      jobId: data.jobId, // A?>;L7C5< ID 87 Prisma 4;O 845<?>B5=B=>AB8
      delay, // 045@6:0 ?5@54 2K?>;=5=85< (4;O rate limiting)
    }
  )
  return job
}

// $C=:F8O 4;O 70?CA:0 :0<?0=88
export async function startCampaign(campaignId: string, userId?: string) {
  const job = await campaignQueue.add(
    'start-campaign',
    { campaignId, userId },
    {
      jobId: `campaign-${campaignId}`, // #=8:0;L=K9 ID
    }
  )
  return job
}

// $C=:F8O 4;O ?@8>AB0=>2:8 :0<?0=88
export async function pauseCampaign(campaignId: string) {
  // >;CG05< 2A5 46>1K :0<?0=88
  const jobs = await messageQueue.getJobs(['waiting', 'delayed'])

  for (const job of jobs) {
    if (job.data.campaignId === campaignId) {
      await job.remove()
    }
  }

  console.log(`ø  0<?0=8O ${campaignId} ?@8>AB0=>2;5=0`)
}

// $C=:F8O 4;O >B<5=K :0<?0=88
export async function cancelCampaign(campaignId: string) {
  // #40;O5< 2A5 46>1K :0<?0=88
  const jobs = await messageQueue.getJobs(['waiting', 'delayed', 'active'])

  for (const job of jobs) {
    if (job.data.campaignId === campaignId) {
      await job.remove()
    }
  }

  console.log(`=« 0<?0=8O ${campaignId} >B<5=5=0`)
}

// $C=:F8O 4;O ?>;CG5=8O AB0B8AB8:8 >G5@548
export async function getQueueStats() {
  const [messageStats, campaignStats] = await Promise.all([
    messageQueue.getJobCounts(),
    campaignQueue.getJobCounts(),
  ])

  return {
    messages: messageStats,
    campaigns: campaignStats,
  }
}

// Graceful shutdown
export async function closeQueues() {
  await messageQueue.close()
  await campaignQueue.close()
  await messageQueueEvents.close()
  await campaignQueueEvents.close()
  console.log('= G5@548 70:@KBK')
}
