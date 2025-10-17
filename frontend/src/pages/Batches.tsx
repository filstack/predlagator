// frontend/src/pages/Batches.tsx
import { useState, useEffect } from 'react'
import { useBatchStore } from '../stores/batch-store'
import { useChannelStore } from '../stores/channel-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { formatDate } from '../lib/formatters'
import { Plus, Trash2 } from 'lucide-react'

export default function Batches() {
  const {
    batches,
    isLoading,
    error,
    fetchBatches,
    createBatch,
    deleteBatch,
    clearError,
  } = useBatchStore()

  const { channels, fetchChannels: fetchAvailableChannels } = useChannelStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channelIds: [] as string[],
  })

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    if (isCreateDialogOpen) {
      fetchAvailableChannels({ page: 1, limit: 100 })
    }
  }, [isCreateDialogOpen])

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createBatch(formData)
      setIsCreateDialogOpen(false)
      setFormData({ name: '', description: '', channelIds: [] })
    } catch (error) {
      console.error('Failed to create batch:', error)
    }
  }

  const handleChannelToggle = (channelId: string) => {
    setFormData((prev) => ({
      ...prev,
      channelIds: prev.channelIds.includes(channelId)
        ? prev.channelIds.filter((id) => id !== channelId)
        : [...prev.channelIds, channelId],
    }))
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(id)
      } catch (error) {
        console.error('Failed to delete batch:', error)
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Channel Batches</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Batch</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Batch Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Select Channels (optional)</Label>
                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                      {channels && channels.length > 0 ? (
                        channels.map((channel) => (
                          <div key={channel.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`channel-${channel.id}`}
                              checked={formData.channelIds.includes(channel.id)}
                              onChange={() => handleChannelToggle(channel.id)}
                              className="w-4 h-4"
                            />
                            <label
                              htmlFor={`channel-${channel.id}`}
                              className="text-sm flex-1 cursor-pointer"
                            >
                              @{channel.username} - {channel.title || 'No title'}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No channels available</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.channelIds.length} channel(s) selected
                    </p>
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    Create Batch
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <span>Error: {error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && <div className="text-center py-8">Loading...</div>}

          {/* Table */}
          {!isLoading && batches.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>{batch.description || '-'}</TableCell>
                    <TableCell>{batch.channelCount || 0}</TableCell>
                    <TableCell>{formatDate(batch.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(batch.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Empty state */}
          {!isLoading && batches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No batches found. Create your first batch to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
