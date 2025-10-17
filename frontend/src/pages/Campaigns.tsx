// frontend/src/pages/Campaigns.tsx
import { useState, useEffect } from 'react'
import { useCampaignStore } from '../stores/campaign-store'
import { useBatchStore } from '../stores/batch-store'
import { useTemplateStore } from '../stores/template-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
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
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { formatDate } from '../lib/formatters'
import { Plus, Play, Pause, Trash2 } from 'lucide-react'

export default function Campaigns() {
  const {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    executeCampaignAction,
    deleteCampaign,
    clearError,
  } = useCampaignStore()

  const { batches, fetchBatches } = useBatchStore()
  const { templates, fetchTemplates } = useTemplateStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batchId: '',
    templateId: '',
    mode: 'TEST' as 'TEST' | 'LIVE',
    deliveryRate: 20,
  })

  useEffect(() => {
    fetchCampaigns()
    fetchBatches()
    fetchTemplates()
  }, [])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCampaign({
        ...formData,
        params: {},
      })
      setIsCreateDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        batchId: '',
        templateId: '',
        mode: 'TEST',
        deliveryRate: 20,
      })
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }

  const handleStart = async (id: string) => {
    try {
      await executeCampaignAction(id, { action: 'start' })
    } catch (error) {
      console.error('Failed to start campaign:', error)
    }
  }

  const handlePause = async (id: string) => {
    try {
      await executeCampaignAction(id, { action: 'pause' })
    } catch (error) {
      console.error('Failed to pause campaign:', error)
    }
  }

  const handleResume = async (id: string) => {
    try {
      await executeCampaignAction(id, { action: 'resume' })
    } catch (error) {
      console.error('Failed to resume campaign:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await deleteCampaign(id)
      } catch (error) {
        console.error('Failed to delete campaign:', error)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      QUEUED: 'secondary',
      RUNNING: 'default',
      PAUSED: 'outline',
      COMPLETED: 'default',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Broadcast Campaigns</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name *</Label>
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
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="batch">Batch *</Label>
                    <Select
                      value={formData.batchId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, batchId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name} ({batch.channelCount} channels)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template">Template *</Label>
                    <Select
                      value={formData.templateId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, templateId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mode">Mode *</Label>
                      <Select
                        value={formData.mode}
                        onValueChange={(value: 'TEST' | 'LIVE') =>
                          setFormData({ ...formData, mode: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEST">Test</SelectItem>
                          <SelectItem value="LIVE">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="deliveryRate">Delivery Rate (msg/sec)</Label>
                      <Input
                        id="deliveryRate"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.deliveryRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deliveryRate: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading || !formData.batchId || !formData.templateId}>
                    Create Campaign
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
          {!isLoading && campaigns.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant={campaign.mode === 'LIVE' ? 'default' : 'outline'}>
                        {campaign.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      {campaign.totalJobs > 0
                        ? `${Math.round((campaign.progress / campaign.totalJobs) * 100)}%`
                        : '0%'}
                    </TableCell>
                    <TableCell>{formatDate(campaign.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {campaign.status === 'QUEUED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStart(campaign.id)}
                            title="Start campaign"
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {campaign.status === 'RUNNING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePause(campaign.id)}
                            title="Pause campaign"
                          >
                            <Pause className="h-4 w-4 text-yellow-600" />
                          </Button>
                        )}
                        {campaign.status === 'PAUSED' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResume(campaign.id)}
                              title="Resume campaign"
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(campaign.id)}
                              title="Delete campaign"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {['COMPLETED', 'FAILED', 'CANCELLED'].includes(campaign.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(campaign.id)}
                            title="Delete campaign"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Empty state */}
          {!isLoading && campaigns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns found. Create your first campaign to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
