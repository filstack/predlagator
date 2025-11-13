/**
 * DeleteDialog Component
 * Feature: 004-manual-channel-management
 *
 * Диалог подтверждения удаления канала
 */

import { useState } from 'react'
import type { Channel } from '../../types/channel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Alert } from '../ui/alert'

interface DeleteDialogProps {
  channel: Channel | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (channel: Channel) => Promise<void>
}

export function DeleteDialog({ channel, isOpen, onClose, onConfirm }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!channel) return

    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm(channel)
      onClose()
    } catch (err: any) {
      console.error('Delete error:', err)

      // Handle specific error types
      if (err.response?.status === 409) {
        setError('Канал используется в активных рассылках и не может быть удалён')
      } else if (err.response?.status === 404) {
        setError('Канал не найден')
      } else {
        setError(err.message || 'Не удалось удалить канал')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setError(null)
      onClose()
    }
  }

  if (!channel) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить канал?</DialogTitle>
          <DialogDescription>
            Вы действительно хотите удалить канал <strong>{channel.name}</strong> ({channel.username})?
            Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
