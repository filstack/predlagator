// shared/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', admin.username)

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 10)
  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      passwordHash: operatorPassword,
      role: 'OPERATOR',
    },
  })
  console.log('✅ Operator user created:', operator.username)

  // Create sample channels
  const channelsData = [
    {
      username: 'technews',
      category: 'tech',
      collectedAt: new Date(),
      title: 'Tech News Channel',
      description: 'Latest technology news and updates',
    },
    {
      username: 'breakingnews',
      category: 'новости',
      collectedAt: new Date(),
      title: 'Breaking News',
      description: 'Breaking news from around the world',
    },
    {
      username: 'cryptoupdates',
      category: 'crypto',
      collectedAt: new Date(),
      title: 'Crypto Updates',
      description: 'Cryptocurrency news and market analysis',
    },
    {
      username: 'scitech',
      category: 'tech',
      collectedAt: new Date(),
      title: 'Science & Technology',
      description: 'Science and technology innovations',
    },
    {
      username: 'worldnews',
      category: 'новости',
      collectedAt: new Date(),
      title: 'World News',
      description: 'Global news coverage',
    },
  ]

  for (const channelData of channelsData) {
    await prisma.channel.upsert({
      where: { username: channelData.username },
      update: {},
      create: channelData,
    })
  }
  console.log(`✅ Created ${channelsData.length} sample channels`)

  // Create sample templates
  const templatesData = [
    {
      name: 'Promo Template',
      content:
        'Привет, {{channel_name}}! Специальное предложение: {{offer_text}}\n\nПодробности: {{details_url}}',
      description: 'Standard promotional message template',
    },
    {
      name: 'Welcome Message',
      content:
        'Добро пожаловать в {{channel_name}}!\n\nСпасибо за подписку. Мы рады видеть вас среди наших читателей.',
      description: 'Welcome message for new subscribers',
    },
  ]

  const existingTemplates = await prisma.template.findMany()
  if (existingTemplates.length === 0) {
    for (const templateData of templatesData) {
      await prisma.template.create({ data: templateData })
    }
    console.log(`✅ Created ${templatesData.length} sample templates`)
  } else {
    console.log('✅ Templates already exist, skipping...')
  }

  console.log('🎉 Database seeding completed!')
  console.log('\n📝 Login credentials:')
  console.log('   Admin: username=admin, password=admin123')
  console.log('   Operator: username=operator, password=operator123')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
