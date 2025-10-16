// frontend/src/lib/formatters.ts

/**
 * Форматирование даты и времени
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return 'Invalid Date'

  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return 'Invalid Date'

  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return 'Invalid Time'

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}

/**
 * Относительное время (например, "2 часа назад")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return 'Invalid Date'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) return 'только что'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин назад`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч назад`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} дн назад`

  return formatDate(d)
}

/**
 * Форматирование чисел
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'

  return new Intl.NumberFormat('ru-RU').format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '0%'

  return `${value.toFixed(decimals)}%`
}

/**
 * Форматирование размеров файлов
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 B'

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Форматирование username каналов
 */
export function formatChannelUsername(username: string | null | undefined): string {
  if (!username) return 'N/A'

  // Добавляем @ если его нет
  return username.startsWith('@') ? username : `@${username}`
}

/**
 * Форматирование статусов
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown'

  const statusMap: Record<string, string> = {
    ACTIVE: 'Активен',
    INACTIVE: 'Неактивен',
    QUEUED: 'В очереди',
    RUNNING: 'Выполняется',
    PAUSED: 'Приостановлен',
    COMPLETED: 'Завершён',
    CANCELLED: 'Отменён',
    FAILED: 'Ошибка',
    SENT: 'Отправлено',
    SENDING: 'Отправка',
  }

  return statusMap[status] || status
}

/**
 * Форматирование длительности (секунды -> читаемый формат)
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return '0 сек'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} ч`)
  if (minutes > 0) parts.push(`${minutes} мин`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} сек`)

  return parts.join(' ')
}
