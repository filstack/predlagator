// Тест подключения к Supabase
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Попытка подключения к базе данных...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    console.log('DIRECT_URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':****@'));

    // Простой запрос для проверки подключения
    await prisma.$queryRaw`SELECT 1 as test`;

    console.log('✅ Подключение успешно!');
  } catch (error) {
    console.error('❌ Ошибка подключения:');
    console.error(error.message);
    console.error('\nПолная ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
