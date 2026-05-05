import { prisma, disconnectDatabase } from '../src/shared/db/prisma.js';
import bcrypt from 'bcryptjs';

// We use string literals for enums to avoid tsx/prisma import resolution issues in the seed script
const ReminderCategory = {
  MEDICATION: 'MEDICATION',
  APPOINTMENT: 'APPOINTMENT',
  TASK: 'TASK',
  HYDRATION: 'HYDRATION',
  MEAL: 'MEAL',
  CALL: 'CALL',
  CUSTOM: 'CUSTOM',
  GENERAL: 'GENERAL'
} as const;

const PriorityLevel = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const;

const ReminderType = {
  SIMPLE: 'SIMPLE',
  GUIDED: 'GUIDED'
} as const;

const ReminderEventType = {
  DONE: 'DONE',
  SNOOZED: 'SNOOZED',
  SKIPPED: 'SKIPPED',
  DISMISSED: 'DISMISSED'
} as const;

const ChecklistCategory = {
  MORNING: 'MORNING',
  EVENING: 'EVENING',
  GENERAL: 'GENERAL'
} as const;

const ChecklistRunStatus = {
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
} as const;

const PatientDocumentCategory = {
  MEDICATION_PLAN: 'MEDICATION_PLAN',
  DOCTOR_VISIT_NOTE: 'DOCTOR_VISIT_NOTE',
  CARE_PLAN: 'CARE_PLAN'
} as const;

const PatientDocumentStatus = {
  ACTIVE: 'ACTIVE'
} as const;

const ContactSourceType = {
  MANUAL: 'MANUAL'
} as const;

const DEMO_PASSWORD = 'DemoPass123!';

const CAREGIVERS = [
  { email: 'demo.caregiver1@example.com', name: 'Demo Caregiver One' },
  { email: 'demo.caregiver2@example.com', name: 'Demo Caregiver Two' },
  { email: 'demo.caregiver3@example.com', name: 'Demo Caregiver Three' },
  { email: 'demo.caregiver4@example.com', name: 'Demo Caregiver Four' },
];

const PATIENTS = [
  { email: 'demo.patient01@example.com', name: 'Omar Hassan', caregiverIndex: 0 },
  { email: 'demo.patient02@example.com', name: 'Layla Mahmoud', caregiverIndex: 0 },
  { email: 'demo.patient03@example.com', name: 'Nadia Ali', caregiverIndex: 0 },
  { email: 'demo.patient04@example.com', name: 'Hassan Youssef', caregiverIndex: 1 },
  { email: 'demo.patient05@example.com', name: 'Mona Samir', caregiverIndex: 1 },
  { email: 'demo.patient06@example.com', name: 'Karim Adel', caregiverIndex: 2 },
  { email: 'demo.patient07@example.com', name: 'Salma Fouad', caregiverIndex: 2 },
  { email: 'demo.patient08@example.com', name: 'Tarek Amin', caregiverIndex: 2 },
  { email: 'demo.patient09@example.com', name: 'Huda Mostafa', caregiverIndex: 3 },
  { email: 'demo.patient10@example.com', name: 'Sami Ibrahim', caregiverIndex: 3 },
];

const GAMES = [
  { id: 'safe-path', name: 'Safe Path Memory', levels: 5 },
  { id: 'routine-sequence', name: 'Routine Sequence', levels: 4 },
  { id: 'match-familiar', name: 'Match Familiar Items', levels: 3 },
];

function randomDateWithinLast(days: number): Date {
  const now = new Date();
  return new Date(now.getTime() - Math.random() * days * 24 * 60 * 60 * 1000);
}

function randomChance(percentage: number): boolean {
  return Math.random() * 100 < percentage;
}

async function cleanDemoData() {
  console.log('🧹 Cleaning existing demo data...');
  const demoUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'demo.' } },
    select: { id: true }
  });
  const demoUserIds = demoUsers.map(u => u.id);

  if (demoUserIds.length === 0) return;

  // We delete records linked to demo users
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({ where: { OR: [{ patientUserId: { in: demoUserIds } }, { actorUserId: { in: demoUserIds } }] } }),
    prisma.reminderEvent.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.reminder.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.checklistRun.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.checklistTemplate.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.gameLevelResult.deleteMany({ where: { session: { patientUserId: { in: demoUserIds } } } }),
    prisma.gameSession.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.patientDocument.deleteMany({ where: { patientId: { in: demoUserIds } } }),
    prisma.patientImportantInfo.deleteMany({ where: { patientId: { in: demoUserIds } } }),
    prisma.patientSummaryExport.deleteMany({ where: { patientId: { in: demoUserIds } } }),
    prisma.contactMemo.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.patientContact.deleteMany({ where: { patientUserId: { in: demoUserIds } } }),
    prisma.careLink.deleteMany({ where: { OR: [{ patientUserId: { in: demoUserIds } }, { caregiverUserId: { in: demoUserIds } }] } }),
    prisma.user.deleteMany({ where: { id: { in: demoUserIds } } })
  ]);
  console.log('✅ Cleaned existing demo data.');
}

async function seed() {
  const isReset = process.argv.includes('--reset');
  if (isReset) {
    await cleanDemoData();
  } else {
    // Avoid creating duplicates if run without reset
    const exists = await prisma.user.findFirst({ where: { email: CAREGIVERS[0].email } });
    if (exists) {
      console.log('Demo data already exists. Run with --reset to recreate.');
      return;
    }
  }

  console.log('🌱 Seeding demo data...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  // 1. Create Caregivers
  const caregiverUsers = [];
  for (const cg of CAREGIVERS) {
    const user = await prisma.user.create({
      data: {
        email: cg.email,
        displayName: cg.name,
        passwordHash,
        role: 'CAREGIVER',
        emailVerifiedAt: now,
        language: 'en',
      }
    });
    caregiverUsers.push(user);
  }

  // 2. Create Patients & Links
  const patientUsers = [];
  for (const p of PATIENTS) {
    const caregiver = caregiverUsers[p.caregiverIndex];
    const patient = await prisma.user.create({
      data: {
        email: p.email,
        displayName: p.name,
        passwordHash,
        role: 'PATIENT',
        emailVerifiedAt: now,
        language: 'en',
      }
    });
    patientUsers.push(patient);

    // Create CareLink
    await prisma.careLink.create({
      data: {
        caregiverUserId: caregiver.id,
        patientUserId: patient.id,
        invitedByUserId: caregiver.id,
        inviteCode: `DEMO-${Math.floor(Math.random()*1000000)}`,
        status: 'ACTIVE',
        acceptedAt: now,
      }
    });

    // Seed Data for this patient
    console.log(`  - Seeding data for patient: ${p.name}...`);
    await seedPatientData(patient.id, caregiver.id, patient.displayName, caregiver.displayName);
  }

  console.log('\n=======================================');
  console.log('🎉 Demo seed completed.');
  console.log('=======================================');
  console.log('\nCaregiver accounts:');
  CAREGIVERS.forEach(c => console.log(`${c.email} / ${DEMO_PASSWORD}`));
  console.log('\nPatient accounts:');
  PATIENTS.forEach(p => console.log(`${p.email} / ${DEMO_PASSWORD}`));
  
  console.log('\nSuggested demo flow:');
  console.log('1. Log in as demo.caregiver1@example.com');
  console.log('2. Select Omar Hassan');
  console.log('3. Open Progress');
  console.log('4. View reminders/checklists/game history');
  console.log('5. Open Patient Records');
  console.log('6. Generate Summary PDF');
  console.log('7. Open Important Information Card');
  console.log('=======================================\n');
}

async function seedPatientData(patientId: string, caregiverId: string, patientName: string, caregiverName: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Reminders
  const remindersConfig = [
    { title: 'Morning Medication', category: ReminderCategory.MEDICATION, priority: PriorityLevel.HIGH, successRate: 90, time: '08:00' },
    { title: 'Drink Water', category: ReminderCategory.HYDRATION, priority: PriorityLevel.NORMAL, successRate: 65, time: '14:00' },
    { title: 'Evening Walk', category: ReminderCategory.TASK, priority: PriorityLevel.NORMAL, successRate: 75, time: '17:00' },
    { title: 'Call Caregiver', category: ReminderCategory.CALL, priority: PriorityLevel.NORMAL, successRate: 60, time: '18:00' },
  ];

  for (const rc of remindersConfig) {
    const reminder = await prisma.reminder.create({
      data: {
        patientUserId: patientId,
        createdByUserId: caregiverId,
        lastEditedByUserId: caregiverId,
        title: rc.title,
        category: rc.category,
        priority: rc.priority,
        reminderType: ReminderType.SIMPLE,
        scheduledTime: rc.time,
        startDate: thirtyDaysAgo,
      }
    });

    // Create 10-15 events
    const numEvents = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numEvents; i++) {
      const isSuccess = randomChance(rc.successRate);
      let eventType = ReminderEventType.DONE;
      if (!isSuccess) {
        eventType = randomChance(50) ? ReminderEventType.SKIPPED : ReminderEventType.DISMISSED;
      }
      const eventDate = randomDateWithinLast(25);
      await prisma.reminderEvent.create({
        data: {
          reminderId: reminder.id,
          patientUserId: patientId,
          actorUserId: patientId,
          actorRole: 'patient',
          eventType,
          timestamp: eventDate,
        }
      });
      // Also log an analytics event
      await prisma.analyticsEvent.create({
        data: {
          patientUserId: patientId,
          eventName: `reminder_${eventType.toLowerCase()}`,
          occurredAt: eventDate,
        }
      });
    }
  }

  // 2. Checklists
  const clConfig = [
    { title: 'Morning Routine', category: ChecklistCategory.MORNING, steps: ['Wash face', 'Take morning medication', 'Eat breakfast', 'Drink water'] },
    { title: 'Evening Routine', category: ChecklistCategory.EVENING, steps: ['Prepare clothes for tomorrow', 'Take evening medication', 'Brush teeth', 'Go to bed'] },
  ];

  for (const cfg of clConfig) {
    const template = await prisma.checklistTemplate.create({
      data: {
        patientUserId: patientId,
        createdByUserId: caregiverId,
        lastEditedByUserId: caregiverId,
        title: cfg.title,
        category: cfg.category,
        steps: cfg.steps.map((s, idx) => ({ stepId: `s${idx}`, label: s, order: idx })),
      }
    });

    // Create 8-15 runs
    const numRuns = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numRuns; i++) {
      const isComplete = randomChance(80);
      const status = isComplete ? ChecklistRunStatus.COMPLETED : ChecklistRunStatus.ABANDONED;
      const completedCount = isComplete ? cfg.steps.length : Math.floor(Math.random() * cfg.steps.length);
      const eventDate = randomDateWithinLast(25);
      
      await prisma.checklistRun.create({
        data: {
          checklistTemplateId: template.id,
          patientUserId: patientId,
          actorUserId: patientId,
          actorRole: 'patient',
          status,
          totalStepsCount: cfg.steps.length,
          completedStepsCount: completedCount,
          createdAt: eventDate,
        }
      });

      await prisma.analyticsEvent.create({
        data: {
          patientUserId: patientId,
          eventName: `checklist_${status.toLowerCase()}`,
          occurredAt: eventDate,
        }
      });
    }
  }

  // 3. Games
  const numGameSessions = 4 + Math.floor(Math.random() * 7);
  for (let i = 0; i < numGameSessions; i++) {
    const game = GAMES[Math.floor(Math.random() * GAMES.length)];
    const score = 100 + Math.floor(Math.random() * 400);
    const eventDate = randomDateWithinLast(28);

    const session = await prisma.gameSession.create({
      data: {
        patientUserId: patientId,
        actorUserId: patientId,
        actorRole: 'patient',
        gameType: game.id,
        difficultyLevel: 'easy',
        score,
        levelsPlayed: game.levels,
        levelsSucceeded: game.levels - 1,
        completed: true,
        startedAt: new Date(eventDate.getTime() - 1000 * 60 * 5),
        completedAt: eventDate,
      }
    });

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patientId,
        eventName: 'game_session_completed',
        payload: { gameType: game.id, score },
        occurredAt: eventDate,
      }
    });
  }

  // 4. Important Information
  await prisma.patientImportantInfo.create({
    data: {
      patientId: patientId,
      updatedByUserId: caregiverId,
      preferredName: patientName.split(' ')[0],
      primaryLanguage: 'English / Arabic',
      communicationTips: 'Speak slowly and use short instructions.\nOffer one task at a time.',
      calmingStrategies: 'Family photos help with orientation.\nShort walks help reduce restlessness.',
      memorySupportTips: 'Use the Today screen in the morning.\nKeep checklist steps visible during routines.',
      currentMedicationSummary: 'Caregiver-maintained medication summary for demo purposes.',
      visibilityConfig: {
        preferredName: "PATIENT_VISIBLE",
        communicationTips: "PATIENT_VISIBLE",
        calmingStrategies: "PATIENT_VISIBLE",
        currentMedicationSummary: "CAREGIVER_ONLY",
      }
    }
  });

  // 5. Patient Records (Metadata only for demo)
  const docs = [
    { title: '[Demo] Updated Medication List', category: PatientDocumentCategory.MEDICATION_PLAN },
    { title: '[Demo] Follow-up Visit Notes', category: PatientDocumentCategory.DOCTOR_VISIT_NOTE },
    { title: '[Demo] Care Plan Notes', category: PatientDocumentCategory.CARE_PLAN }
  ];

  for (const d of docs) {
    await prisma.patientDocument.create({
      data: {
        patientId: patientId,
        uploadedByUserId: caregiverId,
        title: d.title,
        category: d.category,
        documentDate: randomDateWithinLast(20),
        notes: 'Demo caregiver-uploaded document for organizing patient history.',
        originalFileName: 'demo-doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 10245,
        storageProvider: 'local',
        storageBucket: 'demo',
        storageKey: 'demo',
        status: PatientDocumentStatus.ACTIVE,
      }
    });
  }

  // 6. Contacts
  const contacts = [
    { name: caregiverName, label: 'Primary Caregiver' },
    { name: 'Dr. Sameh', label: 'Doctor / Clinic' },
    { name: 'Amira (Neighbor)', label: 'Neighbor' }
  ];

  for (const c of contacts) {
    const pc = await prisma.patientContact.create({
      data: {
        patientUserId: patientId,
        displayName: c.name,
        sourceType: ContactSourceType.MANUAL,
      }
    });
    
    await prisma.contactMemo.create({
      data: {
        patientUserId: patientId,
        patientContactId: pc.id,
        createdByUserId: caregiverId,
        relationLabel: c.label,
        shortMemo: 'Familiar contact for demo purposes.',
        patientFavorite: true,
      }
    });
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await disconnectDatabase();
});
