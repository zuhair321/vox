const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    const dbs = await prisma.$queryRaw('SHOW DATABASES');
    console.log('Databases:', dbs);
    
    const users = await prisma.user.findMany();
    console.log('Users:', users);
    
    const count = await prisma.user.count();
    console.log('User count:', count);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

test();
