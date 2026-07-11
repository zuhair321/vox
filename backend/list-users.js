import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total users: ${users.length}\n`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.username} (${u.email})`);
    console.log(`   Role: ${u.role} | Status: ${u.status} | Created: ${u.createdAt}`);
    console.log(`   ID: ${u.id}\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
