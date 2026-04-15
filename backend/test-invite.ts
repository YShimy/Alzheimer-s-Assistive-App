import { prisma } from './src/shared/db/prisma.js';

const CARELINK_INCLUDE = {
  caregiver: { select: { id: true, displayName: true, email: true } },
  patient: { select: { id: true, displayName: true, email: true } },
};

async function main() {
  const inviteCode = "FFCBA58D804A";
  const link = await prisma.careLink.findUnique({
    where: { inviteCode },
    include: CARELINK_INCLUDE,
  });
  console.log("Found link?", link);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
