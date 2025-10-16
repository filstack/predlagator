// backend/src/scripts/import-channels.ts
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// Set DATABASE_URL before loading Prisma
const dbPath = path.resolve(__dirname, '../../../shared/prisma/dev.db')
process.env.DATABASE_URL = `file:${dbPath}`

import { PrismaClient } from '../../../shared/node_modules/@prisma/client'

const prisma = new PrismaClient()

interface ScrapedContent {
  title?: string
  username?: string
  description?: string
  links?: string[]
  rkn_registered?: boolean
}

interface ChannelRecord {
  jobId: string
  category: string
  tgstat_url: string
  username: string
  collected_at: string
  status: string
  scraped_content?: string
  scraped_at?: string
  error_message?: string
}

async function importChannelsFromFile(filePath: string): Promise<void> {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let imported = 0
  let skipped = 0
  let errors = 0

  for await (const line of rl) {
    try {
      const record: ChannelRecord = JSON.parse(line)

      // Пропускаем неуспешные записи или без username
      if (record.status !== 'success' || !record.username || record.username === 'unknown') {
        skipped++
        continue
      }

      let scrapedData: ScrapedContent | null = null
      if (record.scraped_content) {
        try {
          scrapedData = JSON.parse(record.scraped_content)
        } catch (e) {
          console.warn(`Failed to parse scraped_content for ${record.username}`)
        }
      }

      // Извлекаем данные
      const username = record.username.replace('@', '')
      const title = scrapedData?.title || null
      const description = scrapedData?.description || null
      const category = record.category
      const tgstatUrl = record.tgstat_url
      const collectedAt = new Date(record.collected_at)

      // Проверяем, существует ли канал
      const existing = await prisma.channel.findUnique({
        where: { username },
      })

      if (existing) {
        // Обновляем существующий канал
        await prisma.channel.update({
          where: { username },
          data: {
            title,
            description,
            category,
            tgstatUrl,
            updatedAt: new Date(),
          },
        })
        console.log(`Updated: @${username}`)
      } else {
        // Создаем новый канал
        await prisma.channel.create({
          data: {
            username,
            title,
            description,
            category,
            tgstatUrl,
            collectedAt,
            isActive: true,
          },
        })
        console.log(`Imported: @${username}`)
        imported++
      }
    } catch (error) {
      console.error(`Error processing line:`, error)
      errors++
    }
  }

  console.log(`\nImport completed!`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error('Usage: tsx import-channels.ts <path-to-ndjson-file>')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Importing channels from: ${filePath}`)
  await importChannelsFromFile(filePath)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  prisma.$disconnect()
  process.exit(1)
})
