import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  const exists = await prisma.user.findUnique({ where: { username: 'zuhair' } });
  if (exists) {
    console.log('zuhair already exists, skipping seed');
    await prisma.$disconnect();
    return;
  }
  const hash = await bcrypt.hash('13201', 10);
  const user = await prisma.user.create({
    data: {
      email: 'zuhair@vox.dev',
      username: 'zuhair',
      displayName: 'Zuhair Ahmed',
      passwordHash: hash,
      role: 'FOUNDER',
      color: '#c91a5a',
      status: 'ONLINE',
    },
  });
  console.log('Created founder:', user.username, user.role);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
