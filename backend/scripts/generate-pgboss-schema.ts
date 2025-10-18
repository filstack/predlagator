/**
 * Генерация SQL для ручной инициализации pg-boss
 */

import PgBoss from 'pg-boss';
import fs from 'fs';
import path from 'path';

const schema = 'pgboss';
const sql = PgBoss.getConstructionPlans(schema);

// Сохраним в файл
const outputPath = path.join(__dirname, '../pg-boss-schema.sql');
fs.writeFileSync(outputPath, sql);

console.log('✅ SQL команды сохранены в файл:', outputPath);
console.log('\n📋 Содержимое:');
console.log('=====================================');
console.log(sql);
console.log('=====================================');
console.log('\n📝 Инструкция:');
console.log('1. Откройте Supabase Dashboard → SQL Editor');
console.log('2. Скопируйте содержимое файла pg-boss-schema.sql');
console.log('3. Выполните SQL');
console.log('4. Перезапустите сервер и worker');
