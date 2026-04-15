import { prisma } from './src/shared/db/prisma.js';

async function main() {
  const result = await prisma.careLink.findMany();
  console.log("CareLinks:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
