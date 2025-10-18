/**
 * ChannelCard Component
 * Feature: 004-manual-channel-management
 *
 * Карточка для отображения информации о канале с кнопками действий
 */

import { Edit, Trash2, ExternalLink } from 'lucide-react'
import type { Channel } from '../../types/channel'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { formatDate } from '../../lib/formatters'

interface ChannelCardProps {
  channel: Channel
  onEdit: (channel: Channel) => void
  onDelete: (channel: Channel) => void
}

export function ChannelCard({ channel, onEdit, onDelete }: ChannelCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold">{channel.name}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{channel.username}</span>
            {channel.status === 'active' ? (
              <Badge variant="default" className="text-xs">
                Активен
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Неактивен
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(channel)}
            title="Редактировать канал"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(channel)}
            title="Удалить канал"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Title */}
          {channel.title && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="text-sm">{channel.title}</p>
            </div>
          )}

          {/* Telegram Links */}
          {channel.telegram_links && channel.telegram_links.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Telegram ссылки
              </p>
              <div className="flex flex-col gap-1">
                {channel.telegram_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* TGStat URL */}
          {channel.tgstat_url && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                TGStat
              </p>
              <a
                href={channel.tgstat_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {channel.tgstat_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>Создан: {formatDate(channel.created_at)}</p>
            {channel.updated_at !== channel.created_at && (
              <p>Обновлён: {formatDate(channel.updated_at)}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
