// backend/src/workers/index.ts
import { Worker } from 'bullmq'
import { createMessageWorker } from './message-worker'
import { createCampaignWorker } from './campaign-worker'

// 0AA82 0:B82=KE 2>@:5@>2
const workers: Worker[] = []

/**
 * 0?CAB8BL 2A5 2>@:5@K
 */
export function startWorkers() {
  console.log('=€ 0?CA: 2>@:5@>2...')

  // !>740Q< 8 70?CA:05< 2>@:5@K
  const messageWorker = createMessageWorker()
  const campaignWorker = createCampaignWorker()

  workers.push(messageWorker, campaignWorker)

  console.log(' A5 2>@:5@K 70?CI5=K')
  console.log(`   - Message Worker: >1@01>B:0 >B?@02:8 A>>1I5=89`)
  console.log(`   - Campaign Worker: C?@02;5=85 :0<?0=8O<8`)
}

/**
 * AB0=>28BL 2A5 2>@:5@K (graceful shutdown)
 */
export async function stopWorkers() {
  console.log('=Ñ AB0=>2:0 2>@:5@>2...')

  for (const worker of workers) {
    await worker.close()
  }

  workers.length = 0
  console.log(' A5 2>@:5@K >AB0=>2;5=K')
}

/**
 * >;CG8BL AB0BCA 2>@:5@>2
 */
export function getWorkersStatus() {
  return workers.map((worker) => ({
    name: worker.name,
    isRunning: worker.isRunning(),
    isPaused: worker.isPaused(),
  }))
}

// Graceful shutdown ?@8 7025@H5=88 ?@>F5AA0
process.on('SIGTERM', async () => {
  console.log('=â >;CG5= A83=0; SIGTERM')
  await stopWorkers()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('=â >;CG5= A83=0; SIGINT')
  await stopWorkers()
  process.exit(0)
})
