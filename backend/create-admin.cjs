const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('13201', 10);
  
  const existing = await prisma.user.findUnique({ where: { username: 'zuhair' } });
  
  if (existing) {
    const updated = await prisma.user.update({
      where: { username: 'zuhair' },
      data: { role: 'ADMIN', passwordHash: hash },
      select: { id: true, username: true, email: true, role: true }
    });
    console.log('Updated existing user to ADMIN:', JSON.stringify(updated, null, 2));
  } else {
    const user = await prisma.user.create({
      data: {
        username: 'zuhair',
        displayName: 'Zuhair',
        email: 'zuhair@vox.admin',
        passwordHash: hash,
        role: 'ADMIN',
        status: 'ONLINE',
        emailVerified: true
      },
      select: { id: true, username: true, email: true, role: true }
    });
    console.log('Created admin user:', JSON.stringify(user, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
