// frontend/src/pages/Channels.tsx
import { useState, useEffect } from 'react'
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
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { formatDate, formatNumber } from '../lib/formatters'

export default function Channels() {
  const channels = useChannelStore((state) => state.channels) || []
  const isLoading = useChannelStore((state) => state.isLoading)
  const error = useChannelStore((state) => state.error)
  const totalCount = useChannelStore((state) => state.totalCount) || 0
  const currentPage = useChannelStore((state) => state.currentPage) || 1
  const fetchChannels = useChannelStore((state) => state.fetchChannels)
  const clearError = useChannelStore((state) => state.clearError)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const limit = 20

  useEffect(() => {
    fetchChannels({
      page: currentPage,
      limit,
      search: search || undefined,
      category,
    })
  }, [currentPage, search, category, fetchChannels])

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalCount / limit)
    if (currentPage < totalPages) {
      fetchChannels({ page: currentPage + 1, limit, search: search || undefined, category })
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchChannels({ page: currentPage - 1, limit, search: search || undefined, category })
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

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
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

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
          {!isLoading && Array.isArray(channels) && channels.length > 0 && (
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
                        {channel.memberCount ? formatNumber(channel.memberCount) : '-'}
                      </TableCell>
                      <TableCell>
                        {channel.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(channel.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * limit + 1} to{' '}
                  {Math.min(currentPage * limit, totalCount)} of {totalCount} channels
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoading && Array.isArray(channels) && channels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No channels found matching your search' : 'No channels found'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
