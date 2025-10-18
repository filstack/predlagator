/**
 * ImportChannelsDialog Component
 * Feature: 004-manual-channel-management
 *
 * Диалог для импорта каналов из JSONL файлов
 */

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
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
import { api } from '../../lib/api-client'

interface ImportChannelsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ImportStats {
  imported: number
  updated: number
  skipped: number
  errors: number
}

interface ImportResponse {
  success: boolean
  stats: ImportStats
  errorMessages?: string[]
}

export function ImportChannelsDialog({ isOpen, onClose, onSuccess }: ImportChannelsDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [errorMessages, setErrorMessages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file extension
      if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.ndjson')) {
        setError('Пожалуйста, выберите JSONL файл (.jsonl или .ndjson)')
        return
      }

      setSelectedFile(file)
      setError(null)
      setImportStats(null)
      setErrorMessages([])
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Пожалуйста, выберите файл')
      return
    }

    setIsUploading(true)
    setError(null)
    setImportStats(null)
    setErrorMessages([])

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await api.post<ImportResponse>('/channels/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setImportStats(response.data.stats)
      setErrorMessages(response.data.errorMessages || [])

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.response?.data?.error || err.message || 'Не удалось импортировать каналы')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null)
      setError(null)
      setImportStats(null)
      setErrorMessages([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импортировать каналы из файла</DialogTitle>
          <DialogDescription>
            Загрузите JSONL файл с каналами для импорта. Файл должен содержать записи с полями:
            category, tgstat_url, username.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,.ndjson"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="file-input"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? 'Выбрать другой файл' : 'Выбрать файл'}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Выбран: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <p>{error}</p>
            </Alert>
          )}

          {/* Import Stats */}
          {importStats && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <div className="space-y-2">
                <p className="font-semibold text-green-800">Импорт завершён!</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Импортировано:</span>{' '}
                    <span className="font-medium">{importStats.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Обновлено:</span>{' '}
                    <span className="font-medium">{importStats.updated}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Пропущено:</span>{' '}
                    <span className="font-medium">{importStats.skipped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ошибок:</span>{' '}
                    <span className="font-medium">{importStats.errors}</span>
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Error Messages */}
          {errorMessages.length > 0 && (
            <Alert variant="destructive">
              <div className="space-y-2">
                <p className="font-semibold">Ошибки при импорте:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {errorMessages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {importStats ? 'Закрыть' : 'Отмена'}
          </Button>
          {!importStats && (
            <Button onClick={handleImport} disabled={!selectedFile || isUploading}>
              {isUploading ? 'Импорт...' : 'Импортировать'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

