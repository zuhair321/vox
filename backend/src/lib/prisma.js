// Single shared PrismaClient instance.
// Reusing one client across the process avoids exhausting DB connections.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.voxPrisma ??
  new PrismaClient({
    log: [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.voxPrisma = prisma;
}
