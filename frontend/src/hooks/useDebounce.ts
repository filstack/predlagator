import { useEffect, useState } from 'react'

/**
 * Debounce hook для отложенного выполнения
 * Используется для inline validation и оптимизации запросов
 *
 * @param value - Значение для debounce
 * @param delay - Задержка в миллисекундах (по умолчанию 500ms)
 * @returns Отложенное значение
 *
 * @example
 * const [username, setUsername] = useState('')
 * const debouncedUsername = useDebounce(username, 500)
 *
 * useEffect(() => {
 *   if (debouncedUsername) {
 *     checkUsernameAvailability(debouncedUsername)
 *   }
 * }, [debouncedUsername])
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Устанавливаем таймер для обновления значения
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Очищаем таймер при изменении value или delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
