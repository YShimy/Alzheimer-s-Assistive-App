import { prisma } from './src/shared/db/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log("All users in DB:");
  users.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, PasswordHash: ${u.passwordHash ? 'Exists' : 'NULL'}`));
  
  const caregivers = users.filter(u => u.role === 'CAREGIVER');
  for (const c of caregivers) {
    console.log(`Deleting caregiver ${c.email}...`);
    await prisma.user.delete({ where: { id: c.id } });
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
