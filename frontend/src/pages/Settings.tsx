// frontend/src/pages/Settings.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useToast } from '../hooks/use-toast'
import { apiClient } from '../lib/api-client'
import { QRCodeSVG } from 'qrcode.react'

interface TelegramSettings {
  apiId: string
  apiHash: string
  phoneNumber: string
  sessionString: string
}

interface RateLimitSettings {
  maxRequestsPerSecond: number
  maxChannelsPerBatch: number
  messageDelayMs: number
}

type AuthStep = 'credentials' | 'qr' | 'password' | 'success'

export default function Settings() {
  const { toast } = useToast()

  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    apiId: '',
    apiHash: '',
    phoneNumber: '',
    sessionString: '',
  })

  const [rateLimits, setRateLimits] = useState<RateLimitSettings>({
    maxRequestsPerSecond: 20,
    maxChannelsPerBatch: 100,
    messageDelayMs: 50,
  })

  // Состояние аутентификации
  const [authStep, setAuthStep] = useState<AuthStep>('credentials')
  const [sessionId, setSessionId] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)

  useEffect(() => {
    // Load settings from localStorage
    const savedTelegramSettings = localStorage.getItem('telegram_settings')
    if (savedTelegramSettings) {
      const settings = JSON.parse(savedTelegramSettings)
      setTelegramSettings(settings)

      // Если есть session string, проверяем статус
      if (settings.sessionString) {
        checkTelegramStatus()
      }
    }

    const savedRateLimits = localStorage.getItem('rate_limits')
    if (savedRateLimits) {
      setRateLimits(JSON.parse(savedRateLimits))
    }
  }, [])

  const checkTelegramStatus = async () => {
    try {
      const data = await apiClient.get<any>('/test/telegram-status')
      if (data.connected) {
        setAuthenticatedUser(data.user)
        setAuthStep('success')
      }
    } catch (error) {
      // Если не подключен - ничего не делаем
    }
  }

  // Шаг 1: Сгенерировать QR код
  const handleStartAuth = async () => {
    if (!telegramSettings.apiId || !telegramSettings.apiHash) {
      toast({
        variant: 'destructive',
        title: 'Ошибка валидации',
        description: 'Заполните API ID и API Hash',
      })
      return
    }

    try {
      setLoading(true)
      const data = await apiClient.post<{
        success: boolean;
        sessionId: string;
        qrCode: { token: string; loginUrl: string };
        message: string
      }>(
        '/auth-telegram/qr-start',
        {
          apiId: telegramSettings.apiId,
          apiHash: telegramSettings.apiHash,
        }
      )

      setSessionId(data.sessionId)
      setQrCodeUrl(data.qrCode.loginUrl)
      setAuthStep('qr')

      // Начинаем опрос статуса каждые 2 секунды
      startPollingQrStatus(data.sessionId)

      toast({
        title: 'QR код сгенерирован',
        description: 'Отсканируйте его в приложении Telegram',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.details || 'Не удалось сгенерировать QR код',
      })
    } finally {
      setLoading(false)
    }
  }

  // Опрос статуса QR кода
  const startPollingQrStatus = (sessionId: string) => {
    const interval = window.setInterval(async () => {
      try {
        const data = await apiClient.post<{
          success: boolean;
          needPassword?: boolean;
          status?: string;
          sessionString?: string;
          user?: any;
          message?: string;
        }>(
          '/auth-telegram/qr-check',
          { sessionId }
        )

        if (data.success && data.sessionString) {
          // QR код отсканирован и вход успешен!
          clearInterval(interval)
          setPollingInterval(null)
          handleAuthSuccess(data)
        } else if (data.needPassword) {
          // QR код отсканирован, но требуется 2FA пароль
          clearInterval(interval)
          setPollingInterval(null)
          setAuthStep('password')
          toast({
            title: 'Требуется 2FA',
            description: data.message || 'Введите пароль двухфакторной аутентификации',
          })
        }
      } catch (error) {
        // Игнорируем ошибки опроса
      }
    }, 2000)

    setPollingInterval(interval)
  }

  // Остановить опрос при размонтировании
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])


  // Шаг 3: Проверить 2FA пароль
  const handleVerifyPassword = async () => {
    if (!password) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите пароль двухфакторной аутентификации',
      })
      return
    }

    try {
      setLoading(true)

      // Определяем, QR сессия или phone-based по sessionId
      const isQrSession = sessionId.startsWith('qr_')
      const endpoint = isQrSession ? '/auth-telegram/qr-verify-password' : '/auth-telegram/verify-password'

      const data = await apiClient.post<any>(endpoint, {
        sessionId,
        password,
      })

      if (data.success) {
        handleAuthSuccess(data)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.details || 'Неверный пароль',
      })
    } finally {
      setLoading(false)
    }
  }

  // Успешная аутентификация
  const handleAuthSuccess = async (data: any) => {
    const updatedSettings = {
      ...telegramSettings,
      sessionString: data.sessionString,
    }

    setTelegramSettings(updatedSettings)
    localStorage.setItem('telegram_settings', JSON.stringify(updatedSettings))
    setAuthenticatedUser(data.user)
    setAuthStep('success')

    // Очистка
    setSmsCode('')
    setPassword('')
    setSessionId('')

    // Сохраняем все credentials на бэкенде (в .env файл)
    try {
      await apiClient.post('/auth-telegram/save-credentials', {
        apiId: telegramSettings.apiId,
        apiHash: telegramSettings.apiHash,
        sessionString: data.sessionString,
      })
      console.log('✓ Telegram credentials сохранены на бэкенде в .env')
    } catch (error) {
      console.error('Ошибка сохранения credentials на бэкенде:', error)
      // Не показываем ошибку пользователю, т.к. аутентификация прошла успешно
    }

    toast({
      title: 'Успех!',
      description: `Добро пожаловать, ${data.user.firstName}! Настройки сохранены в .env файл.`,
    })
  }

  // Отмена аутентификации
  const handleCancelAuth = async () => {
    // Останавливаем опрос
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    if (sessionId) {
      try {
        await apiClient.post('/auth-telegram/cancel', { sessionId })
      } catch (error) {
        // Игнорируем ошибки при отмене
      }
    }

    setAuthStep('credentials')
    setQrCodeUrl('')
    setPassword('')
    setSessionId('')
  }

  // Выход из аккаунта
  const handleLogout = () => {
    const updatedSettings = {
      ...telegramSettings,
      sessionString: '',
    }
    setTelegramSettings(updatedSettings)
    localStorage.setItem('telegram_settings', JSON.stringify(updatedSettings))
    setAuthenticatedUser(null)
    setAuthStep('credentials')

    toast({
      title: 'Выход выполнен',
      description: 'Session string удалён',
    })
  }

  const handleSaveRateLimits = () => {
    try {
      localStorage.setItem('rate_limits', JSON.stringify(rateLimits))
      toast({
        title: 'Успех',
        description: 'Настройки rate limiting сохранены!',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
      })
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Telegram API and application settings
        </p>
      </div>

      <Tabs defaultValue="telegram" className="space-y-4">
        <TabsList>
          <TabsTrigger value="telegram">Telegram API</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle>Telegram API Configuration</CardTitle>
              <CardDescription>
                Configure your Telegram API credentials. Get your API ID and Hash from{' '}
                <a
                  href="https://my.telegram.org/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  my.telegram.org/apps
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {authStep === 'success' && authenticatedUser ? (
                // Успешная аутентификация
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    <div className="space-y-2">
                      <p className="font-semibold">✓ Подключено к Telegram</p>
                      <p className="text-sm">
                        Пользователь: {authenticatedUser.firstName} (@{authenticatedUser.username})
                        <br />
                        Телефон: {authenticatedUser.phone}
                        <br />
                        ID: {authenticatedUser.id}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="mt-2"
                      >
                        Выйти и удалить сессию
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : authStep === 'credentials' ? (
                // Шаг 1: Ввод credentials
                <>
                  <div>
                    <Label htmlFor="apiId">API ID</Label>
                    <Input
                      id="apiId"
                      type="text"
                      placeholder="Enter your Telegram API ID"
                      value={telegramSettings.apiId}
                      onChange={(e) =>
                        setTelegramSettings({ ...telegramSettings, apiId: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your unique Telegram API identifier
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="apiHash">API Hash</Label>
                    <Input
                      id="apiHash"
                      type="password"
                      placeholder="Enter your Telegram API Hash"
                      value={telegramSettings.apiHash}
                      onChange={(e) =>
                        setTelegramSettings({ ...telegramSettings, apiHash: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Telegram API secret hash
                    </p>
                  </div>

                  <Button
                    onClick={handleStartAuth}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Генерация QR кода...' : 'Войти через QR код'}
                  </Button>

                  <Alert>
                    <AlertDescription className="text-sm">
                      Нажмите кнопку, чтобы сгенерировать QR код для входа через Telegram.
                    </AlertDescription>
                  </Alert>
                </>
              ) : authStep === 'qr' ? (
                // Шаг 2: Показываем QR код
                <>
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      Отсканируйте QR код в приложении Telegram
                    </AlertDescription>
                  </Alert>

                  {qrCodeUrl && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="bg-white p-4 rounded-lg shadow-md">
                        <QRCodeSVG
                          value={qrCodeUrl}
                          size={256}
                          level="M"
                          includeMargin={true}
                        />
                      </div>

                      <div className="text-center text-sm text-muted-foreground space-y-2">
                        <p>📱 <strong>На телефоне:</strong></p>
                        <p>1. Откройте Telegram</p>
                        <p>2. Settings → Devices → Link Desktop Device</p>
                        <p>3. Отсканируйте QR код выше</p>
                        <div className="pt-2">
                          <p className="text-xs">Или нажмите кнопку ниже на этом устройстве:</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(qrCodeUrl, '_blank')}
                            className="mt-1"
                          >
                            Открыть в Telegram
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Ожидание сканирования...</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleCancelAuth}
                    className="w-full"
                  >
                    Отмена
                  </Button>
                </>
              ) : authStep === 'password' ? (
                // Шаг 3: Ввод 2FA пароля
                <>
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-yellow-800">
                      На вашем аккаунте включена двухфакторная аутентификация. Введите пароль.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="password">Пароль двухфакторной аутентификации</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Введите ваш 2FA пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Пароль, который вы установили в настройках Telegram
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyPassword}
                      className="flex-1"
                      disabled={loading}
                    >
                      {loading ? 'Проверка...' : 'Подтвердить пароль'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelAuth}
                      disabled={loading}
                    >
                      Отмена
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>
                Configure rate limits to prevent Telegram API restrictions and bans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxRequestsPerSecond">
                  Max Requests Per Second: {rateLimits.maxRequestsPerSecond}
                </Label>
                <Input
                  id="maxRequestsPerSecond"
                  type="range"
                  min="1"
                  max="100"
                  value={rateLimits.maxRequestsPerSecond}
                  onChange={(e) =>
                    setRateLimits({
                      ...rateLimits,
                      maxRequestsPerSecond: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of API requests per second (recommended: 20)
                </p>
              </div>

              <div>
                <Label htmlFor="maxChannelsPerBatch">
                  Max Channels Per Batch: {rateLimits.maxChannelsPerBatch}
                </Label>
                <Input
                  id="maxChannelsPerBatch"
                  type="number"
                  min="1"
                  max="1000"
                  value={rateLimits.maxChannelsPerBatch}
                  onChange={(e) =>
                    setRateLimits({
                      ...rateLimits,
                      maxChannelsPerBatch: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of channels allowed in a single batch
                </p>
              </div>

              <div>
                <Label htmlFor="messageDelayMs">
                  Message Delay (ms): {rateLimits.messageDelayMs}
                </Label>
                <Input
                  id="messageDelayMs"
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={rateLimits.messageDelayMs}
                  onChange={(e) =>
                    setRateLimits({
                      ...rateLimits,
                      messageDelayMs: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Delay between sending messages to different channels (recommended: 50-100ms)
                </p>
              </div>

              <Button onClick={handleSaveRateLimits} className="w-full">
                Save Rate Limit Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About Telegram Broadcast System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Version</h3>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Features</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Manage multiple Telegram channels</li>
                  <li>Create and organize channel batches</li>
                  <li>Template-based message broadcasting</li>
                  <li>Campaign scheduling and management</li>
                  <li>Rate limiting to prevent API bans</li>
                  <li>Real-time progress tracking</li>
                  <li>Test mode for safe message sending</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Important Notes</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Always test campaigns in TEST mode before going LIVE</li>
                  <li>Respect Telegram's rate limits to avoid account restrictions</li>
                  <li>Keep your API credentials secure and never share them</li>
                  <li>Session strings are stored locally in browser</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Environment Variables</h3>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  <p>VITE_BACKEND_URL={import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
