// frontend/src/pages/Channels.tsx
import { useState, useEffect } from 'react'
import { channelsApi, Channel, ChannelQuery } from '../lib/api-client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState<ChannelQuery>({
    page: 1,
    limit: 20,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  const fetchChannels = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await channelsApi.list(query)
      setChannels(response.data.data)
      setPagination(response.data.pagination)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch channels')
      console.error('Error fetching channels:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [query])

  const handleSearch = (search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }))
  }

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      setQuery((prev) => ({ ...prev, page: prev.page! + 1 }))
    }
  }

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setQuery((prev) => ({ ...prev, page: prev.page! - 1 }))
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Telegram Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Search channels..."
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
              Error: {error}
            </div>
          )}

          {/* Loading */}
          {loading && <div className="text-center py-8">Loading...</div>}

          {/* Table */}
          {!loading && channels.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell className="font-mono">
                        @{channel.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{channel.category}</Badge>
                      </TableCell>
                      <TableCell>{channel.title || '-'}</TableCell>
                      <TableCell>
                        {channel.memberCount?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        {channel.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(channel.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{' '}
                  of {pagination.total} channels
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && channels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No channels found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
