// backend/src/scripts/import-channels.ts
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScrapedContent {
  title?: string
  username?: string
  description?: string
  links?: string[]
  rkn_registered?: boolean
}

interface ChannelRecord {
  category: string
  tgstat_url: string
  username: string | null
  collected_at: string
  status?: string
  scraped_content?: string
  scraped_at?: string
  error_message?: string
}

async function importChannelsFromFile(filePath: string, userId: string): Promise<void> {
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let imported = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for await (const line of rl) {
    if (!line.trim()) continue // Skip empty lines

    try {
      const record: ChannelRecord = JSON.parse(line)

      // Пропускаем записи без username
      if (!record.username || record.username === 'unknown') {
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
      const username = record.username.startsWith('@') ? record.username : `@${record.username}`
      const title = scrapedData?.title || null
      const name = record.category || username // Используем category как name
      const tgstat_url = record.tgstat_url || null
      const telegram_links = scrapedData?.links || []

      // Проверяем, существует ли канал (по username и user_id)
      const { data: existing } = await supabase
        .from('channels')
        .select('id, updated_at')
        .eq('username', username)
        .eq('user_id', userId)
        .single()

      if (existing) {
        // Обновляем существующий канал
        const { error } = await supabase
          .from('channels')
          .update({
            name,
            title,
            tgstat_url,
            telegram_links,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) {
          console.error(`Error updating ${username}:`, error.message)
          errors++
        } else {
          console.log(`Updated: ${username}`)
          updated++
        }
      } else {
        // Создаем новый канал
        const { error } = await supabase
          .from('channels')
          .insert({
            user_id: userId,
            name,
            username,
            title,
            tgstat_url,
            telegram_links,
            status: 'active',
          })

        if (error) {
          console.error(`Error importing ${username}:`, error.message)
          errors++
        } else {
          console.log(`Imported: ${username}`)
          imported++
        }
      }
    } catch (error: any) {
      console.error(`Error processing line:`, error.message)
      errors++
    }
  }

  console.log(`\nImport completed!`)
  console.log(`Imported: ${imported}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

async function main() {
  const filePath = process.argv[2]
  let userId = process.argv[3]

  if (!filePath) {
    console.error('Usage: tsx import-channels.ts <path-to-jsonl-file> [user-id]')
    console.error('If user-id is not provided, first user from auth.users will be used')
    process.exit(1)
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  // If userId not provided, get first user from auth.users
  if (!userId) {
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error || !users || users.users.length === 0) {
      console.error('No users found in database. Please create a user first or provide user-id')
      process.exit(1)
    }

    userId = users.users[0].id
    console.log(`Using user: ${users.users[0].email} (${userId})`)
  }

  console.log(`Importing channels from: ${filePath}`)
  await importChannelsFromFile(filePath, userId)
  console.log('\nDone!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
