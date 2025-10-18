/**
 * ChannelForm Component
 * Feature: 004-manual-channel-management
 *
 * Форма для создания и редактирования каналов
 */

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useChannelStore } from '../../stores/channel-store'
import { useDebounce } from '../../hooks/useDebounce'
import { channelFormSchema, type ChannelFormData } from '../../schemas/channel-schema'
import type { Channel } from '../../types/channel'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert } from '../ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface ChannelFormProps {
  channel?: Channel | null
  mode: 'create' | 'edit'
  onSuccess?: () => void
  onCancel?: () => void
}

export function ChannelForm({ channel, mode, onSuccess, onCancel }: ChannelFormProps) {
  const createChannel = useChannelStore((state) => state.createChannel)
  const updateChannel = useChannelStore((state) => state.updateChannel)
  const checkUsernameAvailability = useChannelStore((state) => state.checkUsernameAvailability)
  const isLoading = useChannelStore((state) => state.isLoading)
  const error = useChannelStore((state) => state.error)

  const [usernameCheckStatus, setUsernameCheckStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string | null
  }>({ checking: false, available: null, message: null })

  const [showRetryDialog, setShowRetryDialog] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: channel?.name || '',
      username: channel?.username || '',
      title: channel?.title || '',
      tgstat_url: channel?.tgstat_url || '',
      telegram_links: channel?.telegram_links || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'telegram_links',
  })

  // Watch username для inline validation
  const username = watch('username')
  const debouncedUsername = useDebounce(username, 500)

  // Auto-add @ to username if user forgets
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    // If user starts typing and doesn't have @, add it
    if (value && !value.startsWith('@')) {
      value = '@' + value
    }
    setValue('username', value)
  }

  // Inline username validation
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 5) {
        setUsernameCheckStatus({ checking: false, available: null, message: null })
        return
      }

      // Skip check if username hasn't changed in edit mode
      if (mode === 'edit' && debouncedUsername === channel?.username) {
        setUsernameCheckStatus({ checking: false, available: true, message: null })
        return
      }

      setUsernameCheckStatus({ checking: true, available: null, message: null })

      try {
        const result = await checkUsernameAvailability(
          debouncedUsername,
          mode === 'edit' ? channel?.id : undefined
        )
        setUsernameCheckStatus({
          checking: false,
          available: result.available,
          message: result.message || null,
        })
      } catch (err) {
        setUsernameCheckStatus({
          checking: false,
          available: null,
          message: 'Ошибка проверки username',
        })
      }
    }

    checkUsername()
  }, [debouncedUsername, channel?.username, channel?.id, mode, checkUsernameAvailability])

  const onSubmit = async (data: ChannelFormData) => {
    try {
      setNetworkError(null)

      // Transform data for API
      const payload = {
        name: data.name,
        username: data.username,
        title: data.title || null,
        tgstat_url: data.tgstat_url || null,
        telegram_links: data.telegram_links || [],
      }

      if (mode === 'create') {
        await createChannel(payload)
      } else if (channel) {
        await updateChannel(channel.id, {
          ...payload,
          updated_at: channel.updated_at, // For optimistic locking
        })
      }

      onSuccess?.()
    } catch (err: any) {
      console.error('Form submission error:', err)

      // Check if it's a network error
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setNetworkError('Ошибка сети. Проверьте подключение к интернету.')
        setShowRetryDialog(true)
      }
    }
  }

  const handleRetry = () => {
    setShowRetryDialog(false)
    handleSubmit(onSubmit)()
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Название канала <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Новостной канал IT"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Username Field with inline validation */}
        <div className="space-y-2">
          <Label htmlFor="username">
            Username <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="username"
              value={username}
              onChange={handleUsernameChange}
              placeholder="@tech_news_ru"
              disabled={isLoading}
            />
            {usernameCheckStatus.checking && (
              <span className="absolute right-3 top-3 text-sm text-muted-foreground">
                Проверка...
              </span>
            )}
            {!usernameCheckStatus.checking && usernameCheckStatus.available === true && (
              <span className="absolute right-3 top-3 text-sm text-green-600">✓ Доступен</span>
            )}
            {!usernameCheckStatus.checking && usernameCheckStatus.available === false && (
              <span className="absolute right-3 top-3 text-sm text-destructive">✗ Занят</span>
            )}
          </div>
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username.message}</p>
          )}
          {usernameCheckStatus.message && (
            <p className="text-sm text-destructive">{usernameCheckStatus.message}</p>
          )}
        </div>

        {/* Title Field */}
        <div className="space-y-2">
          <Label htmlFor="title">Title (опционально)</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="IT Новости России"
            disabled={isLoading}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* TGStat URL Field */}
        <div className="space-y-2">
          <Label htmlFor="tgstat_url">TGStat URL (опционально)</Label>
          <Input
            id="tgstat_url"
            {...register('tgstat_url')}
            placeholder="https://tgstat.ru/channel/@tech_news_ru"
            disabled={isLoading}
          />
          {errors.tgstat_url && (
            <p className="text-sm text-destructive">{errors.tgstat_url.message}</p>
          )}
        </div>

        {/* Telegram Links Field Array */}
        <div className="space-y-2">
          <Label>Telegram ссылки (опционально)</Label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`telegram_links.${index}`)}
                  placeholder="https://t.me/tech_news_ru"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => remove(index)}
                  disabled={isLoading}
                >
                  Удалить
                </Button>
              </div>
            ))}
            {errors.telegram_links && (
              <p className="text-sm text-destructive">
                {errors.telegram_links.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => append('')}
              disabled={isLoading || fields.length >= 10}
            >
              + Добавить ссылку
            </Button>
            {fields.length >= 10 && (
              <p className="text-sm text-muted-foreground">
                Максимум 10 ссылок на канал
              </p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={isLoading || usernameCheckStatus.available === false}>
            {isLoading ? 'Сохранение...' : mode === 'create' ? 'Создать канал' : 'Сохранить'}
          </Button>
        </div>
      </form>

      {/* Retry Dialog for network errors */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ошибка сети</DialogTitle>
            <DialogDescription>
              {networkError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetryDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleRetry}>
              Повторить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
