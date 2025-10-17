// shared/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('<1 Starting database seed...')

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  })
  console.log(' Admin user created:', admin.username)

  // Create operator user
  const operatorPasswordHash = await bcrypt.hash('operator123', 10)
  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      passwordHash: operatorPasswordHash,
      role: 'OPERATOR',
    },
  })
  console.log(' Operator user created:', operator.username)

  // Create sample channels
  const channels = await prisma.channel.createMany({
    data: [
      {
        username: 'tech_news',
        category: 'technology',
        tgstatUrl: 'https://tgstat.com/channel/@tech_news',
        title: 'Tech News Channel',
        description: 'Latest technology news and updates',
        memberCount: 15000,
        isVerified: true,
        collectedAt: new Date(),
      },
      {
        username: 'crypto_updates',
        category: 'cryptocurrency',
        tgstatUrl: 'https://tgstat.com/channel/@crypto_updates',
        title: 'Crypto Updates',
        description: 'Cryptocurrency market updates',
        memberCount: 25000,
        isVerified: false,
        collectedAt: new Date(),
      },
      {
        username: 'marketing_tips',
        category: 'marketing',
        tgstatUrl: 'https://tgstat.com/channel/@marketing_tips',
        title: 'Marketing Tips',
        description: 'Professional marketing advice',
        memberCount: 8000,
        isVerified: true,
        collectedAt: new Date(),
      },
      {
        username: 'dev_community',
        category: 'technology',
        tgstatUrl: 'https://tgstat.com/channel/@dev_community',
        title: 'Developers Community',
        description: 'Community for software developers',
        memberCount: 12000,
        isVerified: true,
        collectedAt: new Date(),
      },
      {
        username: 'startup_stories',
        category: 'business',
        tgstatUrl: 'https://tgstat.com/channel/@startup_stories',
        title: 'Startup Stories',
        description: 'Inspiring startup success stories',
        memberCount: 18000,
        isVerified: false,
        collectedAt: new Date(),
      },
    ],
  })
  console.log(` Created ${channels.count} sample channels`)

  // Create sample template
  const template = await prisma.template.upsert({
    where: { id: 'sample-template-1' },
    update: {},
    create: {
      id: 'sample-template-1',
      name: 'Welcome Message',
      content: '@825B, {{username}}! =K\n\nK @04K ?@825BAB2>20BL 20A 2 :0B53>@88 {{category}}.\n\n!;548B5 70 =0H8<8 >1=>2;5=8O<8!',
      description: 'Standard welcome message template',
      mediaType: null,
      mediaUrl: null,
    },
  })
  console.log(' Sample template created:', template.name)

  // Create sample batch
  const channelRecords = await prisma.channel.findMany({ take: 3 })
  const batch = await prisma.batch.create({
    data: {
      name: 'Tech Channels Batch',
      description: 'First batch of technology-related channels',
      createdById: operator.id,
      channelCount: channelRecords.length,
      channels: {
        connect: channelRecords.map((ch) => ({ id: ch.id })),
      },
    },
  })
  console.log(' Sample batch created:', batch.name)

  // Log seed completion to audit log
  await prisma.auditLog.create({
    data: {
      action: 'DATABASE_MIGRATION',
      resourceType: 'Database',
      resourceId: 'seed',
      metadata: {
        users: 2,
        channels: channels.count,
        batches: 1,
        templates: 1,
      },
      severity: 'INFO',
    },
  })
  console.log(' Audit log created')

  console.log('\n<� Database seeding completed successfully!')
  console.log('\n=� Default credentials:')
  console.log('   Admin: username=admin, password=admin123')
  console.log('   Operator: username=operator, password=operator123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('L Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
