// frontend/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary компонент для отлова ошибок React
 * Показывает fallback UI при возникновении ошибок в дереве компонентов
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку (можно отправить в сервис мониторинга)
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // TODO: Отправить ошибку в систему логирования (например, Sentry)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Если предоставлен кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Дефолтный fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-2xl w-full p-6 space-y-6">
            <Alert variant="destructive">
              <AlertTitle className="text-xl font-bold">
                Произошла ошибка
              </AlertTitle>
              <AlertDescription className="mt-2">
                Приложение столкнулось с неожиданной ошибкой. Пожалуйста,
                попробуйте обновить страницу или обратитесь к администратору.
              </AlertDescription>
            </Alert>

            {/* Детали ошибки (только в dev режиме) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-semibold text-destructive mb-2">
                    Тип ошибки:
                  </h3>
                  <p className="text-sm font-mono">{this.state.error.name}</p>
                </div>

                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-semibold text-destructive mb-2">
                    Сообщение:
                  </h3>
                  <p className="text-sm font-mono whitespace-pre-wrap">
                    {this.state.error.message}
                  </p>
                </div>

                {this.state.error.stack && (
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <h3 className="font-semibold text-destructive mb-2">
                      Stack Trace:
                    </h3>
                    <pre className="text-xs font-mono text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {this.state.errorInfo && (
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <h3 className="font-semibold text-destructive mb-2">
                      Component Stack:
                    </h3>
                    <pre className="text-xs font-mono text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Действия */}
            <div className="flex gap-4">
              <Button onClick={this.handleReset} variant="default">
                Попробовать снова
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Перезагрузить страницу
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="ghost"
              >
                На главную
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC для оборачивания компонентов в ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}
