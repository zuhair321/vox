import { prisma } from './lib/prisma.js';
try {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  console.log(JSON.stringify(tables.map(r => r.tablename), null, 2));
} catch (e) {
  console.error(e.message);
}
