import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearCaregivers() {
  const result = await prisma.user.deleteMany({
    where: { role: 'CAREGIVER' }
  });
  console.log(`Deleted ${result.count} caregiver(s) successfully.`);
}

clearCaregivers()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
