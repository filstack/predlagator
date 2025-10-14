# API Contracts

This directory contains OpenAPI 3.0 specifications for all API endpoints.

## Files

- **auth.yaml**: Authentication endpoints (login, logout, token verification)
- **channels.yaml**: Channel catalog management (list, import, search)
- **batches.yaml**: Batch operations (create, update, delete)
- **campaigns.yaml**: Campaign execution (create, start, pause, resume, cancel)
- **templates.yaml**: Message template management (CRUD, preview)

## Usage

### Viewing Documentation

Use any OpenAPI-compatible tool to view the specs:

**Swagger UI** (online):
```bash
# Upload YAML file to https://editor.swagger.io/
```

**Redoc** (local):
```bash
npm install -g redoc-cli
redoc-cli serve auth.yaml
```

**Stoplight Studio** (desktop):
Download from https://stoplight.io/studio/

### Generating Client Code

**TypeScript (axios)**:
```bash
npm install -g openapi-generator-cli
openapi-generator-cli generate -i auth.yaml -g typescript-axios -o frontend/src/api/generated
```

**Python (httpx)**:
```bash
openapi-generator-cli generate -i auth.yaml -g python -o backend/tests/api_client
```

### Validating Requests

**Backend validation** (Express + OpenAPI Validator):
```bash
npm install express-openapi-validator
```

```typescript
// backend/src/api/index.ts
import * as OpenApiValidator from 'express-openapi-validator'

app.use(
  OpenApiValidator.middleware({
    apiSpec: './specs/001-telegram-channel-broadcast/contracts/auth.yaml',
    validateRequests: true,
    validateResponses: true
  })
)
```

## Authentication

All endpoints (except `/auth/login`) require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

Get token from `/auth/login` endpoint.

## Rate Limits

- **Login**: 5 attempts per minute per IP
- **Channel import**: 1 file per minute per user
- **Campaign operations**: 10 requests per minute per user

## Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "validation error details"
    }
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid JWT token
- `FORBIDDEN`: Insufficient permissions for operation
- `INVALID_INPUT`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `RESOURCE_NOT_FOUND`: Entity does not exist

## Permissions

| Endpoint | ADMIN | OPERATOR | AUDITOR |
|----------|-------|----------|---------|
| Auth     | ✅     | ✅        | ✅       |
| Channels (read) | ✅ | ✅ | ✅ |
| Channels (import) | ✅ | ✅ | ❌ |
| Batches (read) | ✅ | ✅ | ✅ |
| Batches (write) | ✅ | ✅ | ❌ |
| Templates (read) | ✅ | ✅ | ✅ |
| Templates (write) | ✅ | ✅ | ❌ |
| Campaigns (read) | ✅ | ✅ | ✅ |
| Campaigns (write) | ✅ | ✅ | ❌ |

## Pagination

All list endpoints use cursor-based pagination:

**Request**:
```http
GET /api/channels?limit=50&cursor=cl9x2k3j40000356t8g9h1b2c
```

**Response**:
```json
{
  "channels": [...],
  "pagination": {
    "nextCursor": "cl9x2k3j40000356t8g9h1b2d",
    "hasMore": true
  }
}
```

## Testing

Use provided example values in API specs:

```bash
# Login
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator1","password":"SecurePass123!"}'

# List channels (with token)
curl https://api.example.com/api/channels \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Next Steps

After reviewing contracts:
1. Implement backend API routes (Express handlers)
2. Generate TypeScript types for frontend
3. Create integration tests using contracts as spec
4. Set up request/response validation middleware
