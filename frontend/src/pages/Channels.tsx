// frontend/src/pages/Channels.tsx
import { useState, useEffect } from 'react'
import { useChannelStore } from '../stores/channel-store'
import { ChannelForm } from '../components/channels/ChannelForm'
import { ChannelCard } from '../components/channels/ChannelCard'
import { DeleteDialog } from '../components/channels/DeleteDialog'
import { ImportChannelsDialog } from '../components/channels/ImportChannelsDialog'
import type { Channel } from '../types/channel'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

export default function Channels() {
  const channels = useChannelStore((state) => state.channels) || []
  const isLoading = useChannelStore((state) => state.isLoading)
  const error = useChannelStore((state) => state.error)
  const totalCount = useChannelStore((state) => state.totalCount) || 0
  const currentPage = useChannelStore((state) => state.currentPage) || 1
  const fetchChannels = useChannelStore((state) => state.fetchChannels)
  const deleteChannel = useChannelStore((state) => state.deleteChannel)
  const clearError = useChannelStore((state) => state.clearError)

  const [search, setSearch] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const limit = 20

  useEffect(() => {
    fetchChannels({
      page: currentPage,
      limit,
    })
  }, [currentPage, fetchChannels])

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalCount / limit)
    if (currentPage < totalPages) {
      fetchChannels({ page: currentPage + 1, limit })
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchChannels({ page: currentPage - 1, limit })
    }
  }

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false)
    fetchChannels({ page: 1, limit }) // Refresh list
  }

  const handleEdit = (channel: Channel) => {
    setSelectedChannel(channel)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setSelectedChannel(null)
    fetchChannels({ page: currentPage, limit }) // Refresh list
  }

  const handleDelete = (channel: Channel) => {
    setSelectedChannel(channel)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async (channel: Channel) => {
    await deleteChannel(channel.id)
    setSelectedChannel(null)
  }

  const handleImportSuccess = () => {
    setIsImportDialogOpen(false)
    fetchChannels({ page: 1, limit }) // Refresh list
  }

  // Client-side filter for search
  const filteredChannels = search
    ? channels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(search.toLowerCase()) ||
          channel.username.toLowerCase().includes(search.toLowerCase()) ||
          (channel.title && channel.title.toLowerCase().includes(search.toLowerCase()))
      )
    : channels

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Управление каналами</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              Импортировать
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              Добавить канал
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Поиск по названию, username или title..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <span>Ошибка: {error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && <div className="text-center py-8">Загрузка...</div>}

          {/* Channel Cards Grid */}
          {!isLoading && Array.isArray(filteredChannels) && filteredChannels.length > 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Показано {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalCount)} из {totalCount} каналов
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || isLoading}
                  >
                    Назад
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center px-4">
                    Страница {currentPage} из {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Вперёд
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoading && Array.isArray(filteredChannels) && filteredChannels.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {search ? (
                <p>Нет каналов, соответствующих вашему поиску</p>
              ) : (
                <div className="space-y-4">
                  <p>У вас пока нет каналов</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    Добавить первый канал
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Channel Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить новый канал</DialogTitle>
          </DialogHeader>
          <ChannelForm
            mode="create"
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать канал</DialogTitle>
          </DialogHeader>
          <ChannelForm
            channel={selectedChannel}
            mode="edit"
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setIsEditDialogOpen(false)
              setSelectedChannel(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Channel Dialog */}
      <DeleteDialog
        channel={selectedChannel}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedChannel(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Import Channels Dialog */}
      <ImportChannelsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
