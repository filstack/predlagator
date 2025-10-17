// backend/src/lib/case-converter.ts

/**
 * Конвертирует camelCase в snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Мапинг полей для сортировки из camelCase в snake_case
 */
const SORTBY_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  startedAt: 'started_at',
  completedAt: 'completed_at',
  isActive: 'is_active',
  memberCount: 'member_count',
  channelCount: 'channel_count',
  totalJobs: 'total_jobs',
  successJobs: 'success_jobs',
  failedJobs: 'failed_jobs',
  deliveryRate: 'delivery_rate',
  retryLimit: 'retry_limit',
  usageCount: 'usage_count',
  mediaType: 'media_type',
  mediaUrl: 'media_url',
};

/**
 * Конвертирует sortBy параметр из camelCase в snake_case
 */
export function convertSortBy(sortBy: string | undefined, defaultSort: string = 'created_at'): string {
  if (!sortBy) return defaultSort;

  // Если уже в snake_case, вернуть как есть
  if (sortBy.includes('_')) return sortBy;

  // Если есть в маппинге, использовать маппинг
  if (SORTBY_MAP[sortBy]) return SORTBY_MAP[sortBy];

  // Иначе конвертировать автоматически
  return camelToSnake(sortBy);
}
