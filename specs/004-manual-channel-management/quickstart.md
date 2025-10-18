# Quick Start: Управление каналами вручную

**Feature**: 004-manual-channel-management
**Branch**: `004-manual-channel-management`
**Date**: 2025-10-18

## Overview

Руководство по локальной разработке и тестированию функции управления каналами.

## Prerequisites

- Node.js 20+
- npm или yarn
- Supabase project (URL и service role key в `.env`)
- PostgreSQL client (для миграций) или Supabase CLI

## Quick Setup (5 минут)

### 1. Checkout Feature Branch

```bash
git checkout 004-manual-channel-management
```

### 2. Install Dependencies

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run Database Migration

**Option A: Via Supabase Dashboard**
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `shared/migrations/004_add_channels_table.sql`
3. Execute SQL

**Option B: Via Supabase CLI** (recommended)
```bash
# Initialize Supabase (if not done)
npx supabase init

# Link to your project
npx supabase link --project-ref qjnxcjbzwelokluaiqmk

# Run migration
npx supabase db push

# OR manually:
psql $SUPABASE_DIRECT_URL < shared/migrations/004_add_channels_table.sql
```

### 4. Start Development Servers

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Server running on http://localhost:3000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:5173
```

### 5. Verify Setup

Open browser: `http://localhost:5173`

Navigate to **Channels** tab (should be added to navigation)

## Project Structure

```
backend/src/
├── api/
│   └── channels.ts                 # NEW: CRUD endpoints
├── services/
│   └── channel-service.ts          # NEW: Business logic
├── middleware/
│   └── validation.ts               # NEW: Zod validation middleware
└── types/
    └── channel.ts                  # NEW: TypeScript types

frontend/src/
├── pages/
│   └── ChannelsPage.tsx            # NEW: Main page
├── components/channels/
│   ├── ChannelList.tsx             # NEW: List component
│   ├── ChannelForm.tsx             # NEW: Form component
│   ├── ChannelCard.tsx             # NEW: Card component
│   ├── DeleteDialog.tsx            # NEW: Delete confirmation
│   └── ConflictDialog.tsx          # NEW: Optimistic lock conflict
├── services/
│   └── channel-api.ts              # NEW: API client
└── hooks/
    ├── useChannels.ts              # NEW: React Query hooks
    └── useDebounce.ts              # NEW: Debounce hook
```

## Development Workflow

### Backend Development

#### 1. Add New API Endpoint

Edit `backend/src/api/channels.ts`:

```typescript
import { Router } from 'express';
import { channelService } from '../services/channel-service';
import { validateRequest } from '../middleware/validation';
import { createChannelSchema } from '../../../specs/004-manual-channel-management/contracts/validation';

const router = Router();

router.post('/', validateRequest(createChannelSchema), async (req, res) => {
  const channel = await channelService.createChannel(req.body, req.user.id);
  res.status(201).json(channel);
});

export default router;
```

#### 2. Implement Service Logic

Edit `backend/src/services/channel-service.ts`:

```typescript
import { supabase } from '../lib/supabase';
import type { CreateChannelRequest, Channel } from '../types/channel';

export const channelService = {
  async createChannel(data: CreateChannelRequest, userId: string): Promise<Channel> {
    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        ...data,
        user_id: userId,
        author_created: userId,
        author_updated: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return channel;
  },
};
```

#### 3. Test API Endpoints

```bash
# Create channel
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Channel",
    "username": "@test_channel",
    "telegram_links": ["https://t.me/test_channel"]
  }'

# List channels
curl http://localhost:3000/api/channels \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get by ID
curl http://localhost:3000/api/channels/UUID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update
curl -X PUT http://localhost:3000/api/channels/UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Name",
    "updated_at": "2025-10-18T10:30:00.000Z"
  }'

# Delete
curl -X DELETE http://localhost:3000/api/channels/UUID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check username
curl http://localhost:3000/api/channels/check-username/@test_channel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Development

#### 1. Create Channel Form

```tsx
// frontend/src/components/channels/ChannelForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createChannelSchema } from '../../../specs/004-manual-channel-management/contracts/validation';

export function ChannelForm() {
  const form = useForm({
    resolver: zodResolver(createChannelSchema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

#### 2. Use React Query Hook

```tsx
// frontend/src/hooks/useChannels.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as channelApi from '../services/channel-api';

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: channelApi.listChannels,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelApi.createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}
```

#### 3. Integrate in Page

```tsx
// frontend/src/pages/ChannelsPage.tsx
import { useChannels } from '../hooks/useChannels';
import { ChannelList } from '../components/channels/ChannelList';

export function ChannelsPage() {
  const { data, isLoading } = useChannels();

  if (isLoading) return <div>Loading...</div>;

  return <ChannelList channels={data?.data ?? []} />;
}
```

## Testing

### Backend Tests

```bash
cd backend
npm test

# Run specific test file
npm test -- channels-api.test.ts

# Watch mode
npm test -- --watch
```

**Example Test**:

```typescript
// backend/tests/integration/channels-api.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/channels', () => {
  it('should create a new channel', async () => {
    const response = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Channel',
        username: '@test_channel',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Channel');
  });
});
```

### Frontend Tests

```bash
cd frontend
npm test

# Watch mode
npm test -- --watch
```

**Example Test**:

```typescript
// frontend/tests/channels/ChannelForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelForm } from '../../src/components/channels/ChannelForm';

describe('ChannelForm', () => {
  it('should show validation error for empty name', async () => {
    render(<ChannelForm />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    const error = await screen.findByText(/название канала обязательно/i);
    expect(error).toBeInTheDocument();
  });
});
```

## Common Development Tasks

### Task 1: Add new validation rule

**File**: `specs/004-manual-channel-management/contracts/validation.ts`

```typescript
export const createChannelSchema = z.object({
  // ... existing fields
  new_field: z.string().min(1, 'New field is required'),
});
```

### Task 2: Add new API endpoint

**Files**:
1. `backend/src/api/channels.ts` - add route
2. `backend/src/services/channel-service.ts` - add logic
3. `backend/tests/integration/channels-api.test.ts` - add test

### Task 3: Add new React component

**Files**:
1. `frontend/src/components/channels/NewComponent.tsx`
2. `frontend/tests/channels/NewComponent.test.tsx`

## Troubleshooting

### Issue: Migration fails

**Solution**:
```bash
# Check current database schema
psql $SUPABASE_DIRECT_URL -c "\d channels"

# If table exists, drop and recreate
psql $SUPABASE_DIRECT_URL -c "DROP TABLE channels CASCADE;"
psql $SUPABASE_DIRECT_URL < shared/migrations/004_add_channels_table.sql
```

### Issue: RLS policies block queries

**Solution**:
```sql
-- Temporarily disable RLS for testing (NOT in production!)
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;

-- Re-enable after debugging
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
```

### Issue: Username validation not working

**Check**:
1. Debounce hook is working: `console.log` in useDebounce
2. API endpoint returns correct response
3. Zod schema regex is correct

### Issue: Optimistic locking conflict not detected

**Check**:
1. `updated_at` is being sent in update request
2. Backend compares timestamps correctly
3. Database trigger updates `updated_at` on UPDATE

## Next Steps

1. Implement all CRUD operations (Create, Read, Update, Delete)
2. Add inline username validation
3. Implement optimistic locking conflict UI
4. Add network error handling
5. Implement search/filter
6. Add pagination
7. Write comprehensive tests
8. Add E2E tests with Playwright/Cypress

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Docs](https://zod.dev/)
- [Shadcn/ui Docs](https://ui.shadcn.com/)

## Support

- Check existing tests for examples
- Review contracts in `specs/004-manual-channel-management/contracts/`
- Refer to research.md for architecture decisions
- Refer to data-model.md for database schema

