import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'CAREGIVER' } });
  console.log("Caregivers found:", users);
  
  if (users.length > 0) {
    for (const u of users) {
      console.log(`Deleting ${u.email}...`);
      await prisma.user.delete({ where: { id: u.id } });
    }
  } else {
    console.log("No caregivers found. Let's check ALL users to see if they got saved as PATIENT instead.");
    const all = await prisma.user.findMany();
    console.log("All users:", all);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
