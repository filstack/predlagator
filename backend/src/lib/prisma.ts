// backend/src/lib/prisma.ts
import * as path from 'path'

// Set DATABASE_URL before loading Prisma
const dbPath = path.resolve(__dirname, '../../../shared/prisma/dev.db')
process.env.DATABASE_URL = `file:${dbPath}`

import { PrismaClient } from '../../../shared/node_modules/@prisma/client'

export const prisma = new PrismaClient()

export default prisma
