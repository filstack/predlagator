// backend/src/middleware/audit-logger.ts
import { Request, Response, NextFunction } from 'express'
import { AuditAction, LogSeverity } from '../../../shared/node_modules/@prisma/client'
import prisma from '../lib/prisma'

export interface AuditLogOptions {
  action: AuditAction
  resourceType?: string
  resourceId?: string
  severity?: LogSeverity
  metadata?: Record<string, any>
}

/**
 * Создает запись в audit log
 */
export async function logAudit(
  userId: string | null,
  options: AuditLogOptions,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        metadata: options.metadata || null,
        severity: options.severity || 'INFO',
        ipAddress: ipAddress || null,
      },
    })
  } catch (error) {
    console.error('Ошибка при создании audit log:', error)
  }
}

/**
 * Middleware для автоматического логирования действий
 */
export function auditLoggerMiddleware(action: AuditAction, resourceType?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Сохраняем оригинальный метод json
    const originalJson = res.json.bind(res)

    // Переопределяем метод json для логирования после успешного ответа
    res.json = function (body: any) {
      // Логируем только успешные операции (2xx статусы)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = (req as any).user?.id || null
        const ipAddress = req.ip || req.socket.remoteAddress

        // Определяем resourceId из ответа или параметров
        let resourceId: string | undefined
        if (body?.id) {
          resourceId = body.id
        } else if (req.params?.id) {
          resourceId = req.params.id
        }

        // Создаём метаданные
        const metadata: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        }

        // Добавляем информацию о теле запроса для POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          metadata.body = req.body
        }

        // Определяем severity на основе метода
        let severity: LogSeverity = 'INFO'
        if (req.method === 'DELETE') {
          severity = 'WARNING'
        }

        // Асинхронно логируем (не блокируем ответ)
        logAudit(userId, {
          action,
          resourceType,
          resourceId,
          severity,
          metadata,
        }, ipAddress).catch(console.error)
      }

      return originalJson(body)
    }

    next()
  }
}

/**
 * Утилита для ручного логирования важных событий
 */
export async function logSecurityEvent(
  action: AuditAction,
  options: {
    userId?: string
    resourceType?: string
    resourceId?: string
    metadata?: Record<string, any>
    ipAddress?: string
  }
): Promise<void> {
  await logAudit(options.userId || null, {
    action,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    severity: 'WARNING',
    metadata: options.metadata,
  }, options.ipAddress)
}
