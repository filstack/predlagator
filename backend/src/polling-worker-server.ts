/**
 * Polling Worker Server
 * Запускает worker для обработки campaigns без pg-boss
 */

import dotenv from 'dotenv';
import { PollingWorker } from './workers/polling-worker';

// Загружаем переменные окружения
dotenv.config();

async function start() {
  console.log('🚀 Запуск Polling Worker Server...');

  // Создаем и запускаем worker
  const worker = new PollingWorker();

  // Обработка graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📥 SIGTERM получен, останавливаем worker...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('📥 SIGINT получен, останавливаем worker...');
    worker.stop();
    process.exit(0);
  });

  // Запускаем worker
  await worker.start();
}

start().catch((error) => {
  console.error('❌ Ошибка запуска Polling Worker Server:', error);
  process.exit(1);
});
