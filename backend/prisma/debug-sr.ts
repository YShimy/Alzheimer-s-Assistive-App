import { prisma, disconnectDatabase } from '../src/shared/db/prisma.js';

async function main() {
  // 1. Find demo patient 1
  const patient = await prisma.user.findUnique({
    where: { email: 'demo.patient01@example.com' },
    select: { id: true, email: true, displayName: true, role: true },
  });
  console.log('=== Demo Patient 1 ===');
  console.log(patient ? JSON.stringify(patient, null, 2) : 'NOT FOUND');

  if (!patient) {
    await disconnectDatabase();
    return;
  }

  // 2. Find SR items for this patient
  const items = await prisma.spacedRetrievalItem.findMany({
    where: { patientId: patient.id },
    select: {
      id: true,
      patientId: true,
      prompt: true,
      correctAnswer: true,
      patientVisible: true,
      category: true,
      active: true,
      archivedAt: true,
      createdByUserId: true,
    },
  });
  console.log(`\n=== SR Items for patient ${patient.id} ===`);
  console.log(`Total items: ${items.length}`);
  console.log(`Active items: ${items.filter(i => i.active && !i.archivedAt).length}`);
  console.log(`Patient-visible active items: ${items.filter(i => i.active && !i.archivedAt && i.patientVisible).length}`);
  items.forEach(i => console.log(JSON.stringify(i)));

  // 3. Check settings for this patient
  const settings = await prisma.personalOrientationSettings.findUnique({
    where: { patientId: patient.id },
  });
  console.log(`\n=== Settings for patient ${patient.id} ===`);
  console.log(settings ? JSON.stringify(settings, null, 2) : 'NO SETTINGS FOUND');

  // 4. Check enabledFamilies vs item categories
  if (settings && items.length > 0) {
    const enabledFamilies = (settings.enabledFamilies as string[]) || [];
    const activeItems = items.filter(i => i.active && !i.archivedAt && i.patientVisible);
    console.log(`\n=== Category matching analysis ===`);
    console.log('Enabled families:', enabledFamilies);
    for (const item of activeItems) {
      const match = enabledFamilies.includes(item.category);
      console.log(`  Item "${item.prompt}" | category: ${item.category} | matches enabled: ${match}`);
    }
  }

  // 5. Check care links
  const careLinks = await prisma.careLink.findMany({
    where: { patientUserId: patient.id, status: 'ACTIVE' },
    select: {
      id: true,
      caregiverUserId: true,
      patientUserId: true,
      status: true,
    },
  });
  console.log(`\n=== Active CareLinks ===`);
  careLinks.forEach(cl => console.log(JSON.stringify(cl)));

  await disconnectDatabase();
}

main().catch((e) => {
  console.error(e);
  disconnectDatabase();
});
