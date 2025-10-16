// backend/src/workers/campaign-worker.ts
import { Worker, Job } from 'bullmq'
import { redisConnection } from '../lib/redis'
import prisma from '../lib/prisma'
import { StartCampaignJobData, addSendMessageJob } from '../queues/campaign-queue'

/**
 * >@:5@ 4;O C?@02;5=8O :0<?0=8O<8
 * 1@010BK205B 70?CA: :0<?0=89 8 A>740=85 46>1>2 >B?@02:8
 */
export function createCampaignWorker() {
  const worker = new Worker<StartCampaignJobData>(
    'campaign-management',
    async (job: Job<StartCampaignJobData>) => {
      const { campaignId } = job.data

      console.log(`=€ 0?CA: :0<?0=88 ${campaignId}`)

      try {
        // >;CG05< :0<?0=8N A 40==K<8
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: {
            template: true,
            batch: {
              include: {
                channels: {
                  where: { isActive: true },
                },
              },
            },
            jobs: {
              where: { status: 'QUEUED' },
            },
          },
        })

        if (!campaign) {
          throw new Error(`0<?0=8O ${campaignId} =5 =0945=0`)
        }

        if (campaign.status !== 'RUNNING') {
          throw new Error(`0<?0=8O ${campaignId} =5 2 AB0BCA5 RUNNING`)
        }

        const { template, batch, jobs } = campaign
        const channels = batch.channels

        console.log(`=Ê 0<?0=8O: ${channels.length} :0=0;>2, ${jobs.length} 46>1>2 2 >G5@548`)

        //  0AAG8BK205< 7045@6:C <564C A>>1I5=8O<8 (<A)
        const baseDelay = Math.floor(60000 / campaign.deliveryRate) // 60000ms / rate = delay per message

        // !>740Q< 46>1K 4;O :064>3> :0=0;0 A 7045@6:>9
        let totalDelay = 0
        for (const [index, prismaJob] of jobs.entries()) {
          const channel = channels.find((ch) => ch.id === prismaJob.channelId)

          if (!channel) {
            console.warn(`   0=0; ${prismaJob.channelId} =5 =0945=`)
            continue
          }

          // >102;O5< A;CG09=CN 20@80F8N : 7045@6:5 (±20%)
          const randomVariation = Math.floor(baseDelay * 0.2 * (Math.random() - 0.5))
          const delay = totalDelay + baseDelay + randomVariation

          await addSendMessageJob(
            {
              jobId: prismaJob.id,
              campaignId: campaign.id,
              channelId: channel.id,
              channelUsername: channel.username,
              templateContent: template.content,
              mediaType: template.mediaType,
              mediaUrl: template.mediaUrl,
              attempt: 0,
            },
            delay
          )

          totalDelay = delay

          // 1=>2;O5< ?@>3@5AA :064K5 10 46>1>2
          if (index % 10 === 0) {
            await job.updateProgress((index / jobs.length) * 100)
          }
        }

        // 1=>2;O5< AB0BCA :0<?0=88
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            startedAt: new Date(),
          },
        })

        console.log(` 0<?0=8O ${campaignId} 70?CI5=0: ${jobs.length} 46>1>2 4>102;5=> 2 >G5@54L`)

        return {
          success: true,
          jobsCreated: jobs.length,
          estimatedDuration: Math.floor(totalDelay / 60000), // <8=CBK
        }
      } catch (error) {
        console.error(`L H81:0 70?CA:0 :0<?0=88 ${campaignId}:`, error)

        // 1=>2;O5< AB0BCA :0<?0=88 =0 FAILED
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'FAILED',
          },
        })

        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // 0@0;;5;L=0O >1@01>B:0 4> 5 :0<?0=89
    }
  )

  // !;CH0B5;8 A>1KB89
  worker.on('completed', (job) => {
    console.log(` >@:5@ :0<?0=88 7025@H8; 46>1 ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`L >@:5@ :0<?0=88 ?@>20;8; 46>1 ${job?.id}:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('L H81:0 2>@:5@0 :0<?0=88:', err)
  })

  return worker
}
