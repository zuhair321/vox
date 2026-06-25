import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('13201', 10);
  
  await prisma.user.upsert({
    where: { username: 'zuhair' },
    update: {},
    create: {
      email: 'zuhair@vox.com',
      username: 'zuhair',
      displayName: 'zuhair',
      passwordHash,
      role: 'FOUNDER',
      color: '#5865f2'
    }
  });

  console.log('Seeded zuhair user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
