// backend/src/middleware/audit-logger.ts - MIGRATED TO SUPABASE
import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../lib/supabase';

export interface AuditLogOptions {
  action: string; // AuditAction type
  resourceType?: string;
  resourceId?: string;
  severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  metadata?: Record<string, any>;
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
    const supabase = getSupabase();

    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: options.action,
        resource_type: options.resourceType,
        resource_id: options.resourceId,
        metadata: options.metadata || null,
        severity: options.severity || 'INFO',
        ip_address: ipAddress || null,
      });
  } catch (error) {
    console.error('Ошибка при создании audit log:', error);
  }
}

/**
 * Middleware для автоматического логирования действий
 */
export function auditLoggerMiddleware(action: string, resourceType?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Сохраняем оригинальный метод json
    const originalJson = res.json.bind(res);

    // Переопределяем метод json для логирования после успешного ответа
    res.json = function (body: any) {
      // Логируем только успешные операции (2xx статусы)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = (req as any).user?.id || null;
        const ipAddress = req.ip || req.socket.remoteAddress;

        // Определяем resourceId из ответа или параметров
        let resourceId: string | undefined;
        if (body?.id) {
          resourceId = body.id;
        } else if (req.params?.id) {
          resourceId = req.params.id;
        }

        // Создаём метаданные
        const metadata: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        };

        // Добавляем информацию о теле запроса для POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          metadata.body = req.body;
        }

        // Определяем severity на основе метода
        let severity: 'INFO' | 'WARNING' = 'INFO';
        if (req.method === 'DELETE') {
          severity = 'WARNING';
        }

        // Асинхронно логируем (не блокируем ответ)
        logAudit(userId, {
          action,
          resourceType,
          resourceId,
          severity,
          metadata,
        }, ipAddress).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Утилита для ручного логирования важных событий
 */
export async function logSecurityEvent(
  action: string,
  options: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }
): Promise<void> {
  await logAudit(options.userId || null, {
    action,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    severity: 'WARNING',
    metadata: options.metadata,
  }, options.ipAddress);
}
