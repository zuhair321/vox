import { prisma } from './lib/prisma.js';
try {
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  console.log(JSON.stringify(tables.map(r => Object.values(r)[0]), null, 2));
} catch (e) {
  console.error(e.message);
}
