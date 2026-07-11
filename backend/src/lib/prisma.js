// Single shared PrismaClient instance.
// Reusing one client across the process avoids exhausting DB connections.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Append connection pool params if not already present in the URL.
const dbUrl = process.env.DATABASE_URL || '';
const poolParams = 'connection_limit=20&pool_timeout=10';
const url = dbUrl.includes('connection_limit') ? dbUrl : `${dbUrl}?${poolParams}`;

export const prisma =
  globalForPrisma.voxPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    datasourceUrl: url,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.voxPrisma = prisma;
}
