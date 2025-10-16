// frontend/src/pages/Test.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useToast } from '../hooks/use-toast'
import { apiClient } from '../lib/api-client'

interface Channel {
  id: string
  username: string
  title: string
  isActive: boolean
}

interface TelegramStatus {
  connected: boolean
  user?: {
    id: string
    username: string
    phone: string
    firstName: string
  }
  error?: string
}

export default function Test() {
  const { toast } = useToast()
  const [channels, setChannels] = useState<Channel[]>([])
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [formData, setFormData] = useState({
    channelId: '',
    message: '',
    mediaType: '',
    mediaUrl: '',
  })

  // Загрузка каналов
  useEffect(() => {
    loadChannels()
    checkTelegramStatus()
  }, [])

  const loadChannels = async () => {
    try {
      setLoadingChannels(true)
      const data = await apiClient.get<{ channels: Channel[]; count: number }>('/test/channels')
      console.log('Channels response:', data)
      setChannels(data.channels || [])
    } catch (error: any) {
      console.error('Ошибка загрузки каналов:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось загрузить каналы',
      })
    } finally {
      setLoadingChannels(false)
    }
  }

  const checkTelegramStatus = async () => {
    try {
      setLoadingStatus(true)
      const data = await apiClient.get<TelegramStatus>('/test/telegram-status')
      setTelegramStatus(data)
    } catch (error: any) {
      console.error('Ошибка проверки Telegram статуса:', error)
      setTelegramStatus({
        connected: false,
        error: error.response?.data?.error || 'Не удалось проверить статус',
      })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.channelId || !formData.message) {
      toast({
        variant: 'destructive',
        title: 'Ошибка валидации',
        description: 'Выберите канал и введите сообщение',
      })
      return
    }

    try {
      setLoading(true)

      const payload: any = {
        channelId: formData.channelId,
        message: formData.message,
      }

      if (formData.mediaType && formData.mediaUrl) {
        payload.mediaType = formData.mediaType
        payload.mediaUrl = formData.mediaUrl
      }

      const data = await apiClient.post<{ success: boolean; message: string; channelUsername: string }>('/test/send-message', payload)

      toast({
        title: 'Успех!',
        description: `Сообщение отправлено в канал ${data.channelUsername}`,
      })

      // Очистка формы после успешной отправки
      setFormData({
        ...formData,
        message: '',
        mediaUrl: '',
      })
    } catch (error: any) {
      console.error('Ошибка отправки сообщения:', error)

      const errorDetails = error.response?.data?.details || error.response?.data?.error || 'Неизвестная ошибка'

      toast({
        variant: 'destructive',
        title: 'Ошибка отправки',
        description: errorDetails,
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedChannel = channels.find(ch => ch.id === formData.channelId)

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Тестирование рассылки</h1>
        <p className="text-muted-foreground">
          Отправка сообщений напрямую в Telegram, минуя очереди Redis
        </p>
      </div>

      {/* Статус Telegram */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Статус подключения Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <p className="text-muted-foreground">Проверка подключения...</p>
          ) : telegramStatus?.connected ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <div>
                    <p className="font-semibold">Подключено</p>
                    {telegramStatus.user && (
                      <p className="text-sm mt-1">
                        Пользователь: {telegramStatus.user.firstName} (@{telegramStatus.user.username})
                        <br />
                        Телефон: {telegramStatus.user.phone}
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✗</span>
                  <div>
                    <p className="font-semibold">Не подключено</p>
                    <p className="text-sm mt-1">
                      {telegramStatus?.error || 'Проверьте настройки Telegram API в Settings'}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={checkTelegramStatus}
            className="mt-3"
            disabled={loadingStatus}
          >
            Обновить статус
          </Button>
        </CardContent>
      </Card>

      {/* Форма отправки */}
      <Card>
        <CardHeader>
          <CardTitle>Отправить тестовое сообщение</CardTitle>
          <CardDescription>
            Сообщение будет отправлено немедленно, без использования очередей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* Выбор канала */}
            <div>
              <Label htmlFor="channel">Канал</Label>
              {loadingChannels ? (
                <p className="text-sm text-muted-foreground mt-2">Загрузка каналов...</p>
              ) : channels.length === 0 ? (
                <Alert className="mt-2">
                  <AlertDescription>
                    Нет доступных каналов. Добавьте каналы на странице "Channels".
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={formData.channelId}
                  onValueChange={(value) => setFormData({ ...formData, channelId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите канал" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.title} (@{channel.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedChannel && (
                <p className="text-xs text-muted-foreground mt-1">
                  Статус: {selectedChannel.isActive ? 'Активен' : 'Неактивен'}
                </p>
              )}
            </div>

            {/* Сообщение */}
            <div>
              <Label htmlFor="message">Текст сообщения</Label>
              <Textarea
                id="message"
                placeholder="Введите текст сообщения..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Длина: {formData.message.length} символов
              </p>
            </div>

            {/* Тип медиа (опционально) */}
            <div>
              <Label htmlFor="mediaType">Тип медиа (опционально)</Label>
              <Select
                value={formData.mediaType || 'none'}
                onValueChange={(value) => setFormData({ ...formData, mediaType: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Без медиа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без медиа</SelectItem>
                  <SelectItem value="PHOTO">Фото</SelectItem>
                  <SelectItem value="VIDEO">Видео</SelectItem>
                  <SelectItem value="DOCUMENT">Документ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL медиа */}
            {formData.mediaType && (
              <div>
                <Label htmlFor="mediaUrl">URL медиафайла</Label>
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Примеры для тестирования: https://picsum.photos/800/600 (фото)
                </p>
              </div>
            )}

            {/* Кнопка отправки */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !telegramStatus?.connected || channels.length === 0}
            >
              {loading ? 'Отправка...' : 'Отправить сообщение'}
            </Button>

            {!telegramStatus?.connected && (
              <Alert>
                <AlertDescription className="text-sm">
                  Telegram не подключен. Настройте API credentials в Settings.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Информация */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <p>Сообщения отправляются немедленно, без задержек</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <p>Не требуется Redis или система очередей</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">⚠</span>
            <p>Нет защиты от rate limiting - используйте осторожно</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 font-bold">⚠</span>
            <p>Результаты не сохраняются в базе данных</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">ℹ</span>
            <p>Для массовой рассылки используйте страницу Campaigns</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
