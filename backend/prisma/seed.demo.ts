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

// Game types for the new evidence-informed games
const GAME_TYPES = {
  MEMORY_MATCH: 'ASSOCIATIVE_MEMORY_MATCH',
  SPACED_RETRIEVAL: 'PERSONAL_ORIENTATION_PRACTICE', // My Day & People
} as const;

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
    (prisma as any).gameItemResult?.deleteMany({ where: { session: { patientUserId: { in: demoUserIds } } } }),
    (prisma as any).spacedRetrievalItem?.deleteMany({ where: { patientId: { in: demoUserIds } } }),
    (prisma as any).personalOrientationSettings?.deleteMany({ where: { patientId: { in: demoUserIds } } }),
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

  // 2b. Game Reminders
  await prisma.reminder.create({
    data: {
      patientUserId: patientId,
      createdByUserId: caregiverId,
      lastEditedByUserId: caregiverId,
      title: 'Memory Match Practice',
      category: ReminderCategory.TASK,
      priority: PriorityLevel.NORMAL,
      reminderType: ReminderType.GAME_SESSION,
      gameType: 'ASSOCIATIVE_MEMORY_MATCH',
      scheduledTime: '10:00',
      startDate: thirtyDaysAgo,
      description: 'Time for your Memory Match practice session.',
    }
  });

  await prisma.reminder.create({
    data: {
      patientUserId: patientId,
      createdByUserId: caregiverId,
      lastEditedByUserId: caregiverId,
      title: 'My Day & People Practice',
      category: ReminderCategory.TASK,
      priority: PriorityLevel.NORMAL,
      reminderType: ReminderType.GAME_SESSION,
      gameType: 'PERSONAL_ORIENTATION_PRACTICE',
      scheduledTime: '09:00',
      startDate: thirtyDaysAgo,
      description: 'Practice your My Day & People daily orientation questions.',
    }
  });

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


  // 3. Spaced Retrieval Items
  const srItemsData = [
    { prompt: 'What day is it today?', correctAnswer: new Date().toLocaleDateString('en-US', { weekday: 'long' }), cueText: 'Think about what you did this morning.', category: 'ORIENTATION_DATE', masteryStatus: 'LEARNING', intervalStep: 2 },
    { prompt: 'What month are we in?', correctAnswer: new Date().toLocaleDateString('en-US', { month: 'long' }), cueText: 'Look at a calendar or your phone.', category: 'ORIENTATION_DATE', masteryStatus: 'STRENGTHENING', intervalStep: 4 },
    { prompt: 'What year is it?', correctAnswer: String(new Date().getFullYear()), cueText: null, category: 'ORIENTATION_DATE', masteryStatus: 'MASTERED', intervalStep: 7 },
    { prompt: 'Where can you find your daily reminders?', correctAnswer: 'In the Reminders section of the app', cueText: 'Tap the alarm icon at the bottom of the screen.', category: 'APP_NAVIGATION', masteryStatus: 'LEARNING', intervalStep: 1 },
    { prompt: 'What should you do if you feel unwell?', correctAnswer: 'Contact your caregiver or call for help', cueText: 'Your caregiver\'s number is saved in your Contacts.', category: 'SAFETY_SUPPORT', masteryStatus: 'STRENGTHENING', intervalStep: 3 },
    { prompt: 'What is the name of your caregiver?', correctAnswer: caregiverName.split(' ')[0] ?? 'Your caregiver', cueText: 'Their name is listed in your Contacts section.', category: 'CAREGIVER', masteryStatus: 'MASTERED', intervalStep: 7 },
    { prompt: 'After breakfast, what is your morning routine?', correctAnswer: 'Check reminders, then follow the morning checklist', cueText: 'Check the morning checklist in the app.', category: 'DAILY_ROUTINE', masteryStatus: 'NEW', intervalStep: 0 },
  ];

  const srItems = [];
  for (const item of srItemsData) {
    const now = new Date();
    const srItem = await (prisma as any).spacedRetrievalItem.create({
      data: {
        patientId,
        createdByUserId: caregiverId,
        prompt: item.prompt,
        correctAnswer: item.correctAnswer,
        cueText: item.cueText,
        category: item.category,
        masteryStatus: item.masteryStatus,
        currentIntervalStep: item.intervalStep,
        currentIntervalSeconds: [0,15,30,60,120,300,600][Math.min(item.intervalStep, 6)] ?? 0,
        active: true,
        totalAttempts: 5 + Math.floor(Math.random() * 10),
        correctAttempts: 3 + Math.floor(Math.random() * 8),
        lastPracticedAt: randomDateWithinLast(3),
        nextDueAt: new Date(now.getTime() + (item.masteryStatus === 'MASTERED' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
      }
    });
    srItems.push(srItem);
  }

  // 4. Memory Match Sessions (18–20 sessions over 30 days)
  const mmSessionCount = 16 + Math.floor(Math.random() * 4);
  for (let i = 0; i < mmSessionCount; i++) {
    const level = Math.min(12, 2 + Math.floor(i / 3) + Math.floor(Math.random() * 2));
    const accuracy = 55 + Math.min(35, Math.floor(i * 2.5) + Math.floor(Math.random() * 20));
    const score = Math.round((accuracy / 100) * level * 120);
    const sessionDate = new Date(Date.now() - (30 - i * 1.8) * 24 * 60 * 60 * 1000);
    const isAbandoned = randomChance(8);

    await prisma.gameSession.create({
      data: {
        patientUserId: patientId,
        actorUserId: patientId,
        actorRole: 'patient',
        gameType: GAME_TYPES.MEMORY_MATCH,
        score,
        accuracyPercent: accuracy,
        levelStarted: Math.max(1, level - 1),
        levelCompleted: isAbandoned ? null : level,
        highestLevel: level,
        status: isAbandoned ? 'ABANDONED' : 'COMPLETED',
        completed: !isAbandoned,
        quitEarly: isAbandoned,
        durationSeconds: 120 + Math.floor(Math.random() * 180),
        startedAt: new Date(sessionDate.getTime() - 1000 * 60 * 5),
        completedAt: isAbandoned ? null : sessionDate,
        metadata: { distractorSimilarity: level >= 8 ? 'similar' : level >= 5 ? 'mild' : 'distinct' },
      }
    });

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patientId,
        eventName: isAbandoned ? 'memory_match_session_abandoned' : 'memory_match_session_completed',
        payload: { level, score, accuracyPercent: accuracy },
        occurredAt: sessionDate,
      }
    });
  }

  // 5. Spaced Retrieval Sessions (24–28 sessions over 30 days)
  const srSessionCount = 24 + Math.floor(Math.random() * 4);
  for (let i = 0; i < srSessionCount; i++) {
    const accuracy = 60 + Math.min(32, Math.floor(i * 1.5) + Math.floor(Math.random() * 15));
    const cueUseRate = Math.max(5, 40 - Math.floor(i * 1.2));
    const score = Math.round((accuracy / 100) * 500);
    const sessionDate = new Date(Date.now() - (30 - i * 1.2) * 24 * 60 * 60 * 1000);
    const isAbandoned = randomChance(5);

    await prisma.gameSession.create({
      data: {
        patientUserId: patientId,
        actorUserId: patientId,
        actorRole: 'patient',
        gameType: GAME_TYPES.SPACED_RETRIEVAL,
        score,
        accuracyPercent: accuracy,
        status: isAbandoned ? 'ABANDONED' : 'COMPLETED',
        completed: !isAbandoned,
        quitEarly: isAbandoned,
        durationSeconds: 180 + Math.floor(Math.random() * 180),
        startedAt: new Date(sessionDate.getTime() - 1000 * 60 * 6),
        completedAt: isAbandoned ? null : sessionDate,
        metadata: { cueUseRate: cueUseRate / 100, correctWithoutCue: Math.floor(accuracy * 0.7 / 10), correctWithCue: Math.floor(accuracy * 0.3 / 10) },
      }
    });

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patientId,
        eventName: isAbandoned ? 'spaced_retrieval_session_abandoned' : 'spaced_retrieval_session_completed',
        payload: { score, accuracyPercent: accuracy, cueUseRate },
        occurredAt: sessionDate,
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
    { name: caregiverName, label: 'Primary Caregiver', role: 'Helps with daily app reminders and medicine', include: true, isSens: false, note: 'Spouse/Primary Caregiver', prefName: caregiverName.split(' ')[0] },
    { name: 'Dr. Sameh', label: 'Doctor / Clinic', role: 'Checks your memory and health every month', include: true, isSens: false, note: 'Primary Physician', prefName: 'Dr. Sameh' },
    { name: 'Amira (Neighbor)', label: 'Neighbor', role: 'Helps when caregiver is out', include: true, isSens: false, note: 'Helpful neighbor', prefName: 'Amira' }
  ];

  const seededContacts = [];
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
        includeInGame: c.include,
        isSensitive: c.isSens,
        supportRole: c.role,
        safePatientNote: c.note,
        preferredName: c.prefName,
      }
    });
    seededContacts.push(pc);
  }

  // 7. Personal Orientation Settings
  await prisma.personalOrientationSettings.create({
    data: {
      patientId,
      updatedByUserId: caregiverId,
      supportLevel: 'GUIDED_SUPPORT',
      weeklyTargetSessions: 7,
      enabledFamilies: ['ORIENTATION_DATE', 'ORIENTATION_PLACE', 'CAREGIVER', 'DAILY_ROUTINE', 'APP_NAVIGATION', 'SAFETY_SUPPORT', 'PEOPLE_RECOGNITION', 'SUPPORT_FACT'],
      includePeopleWithoutPhotos: true,
      includeSensitiveContacts: false,
      maxQuestionsPerSession: 6,
      cueStyle: 'button',
      allowMaintenanceItems: true,
    }
  });

  // 8. Spaced Retrieval Items (Enriched with People Recognition & Support Facts)
  const srItemsDataEnriched = [
    { prompt: 'What day is it today?', correctAnswer: new Date().toLocaleDateString('en-US', { weekday: 'long' }), cueText: 'Think about what you did this morning.', category: 'ORIENTATION_DATE', masteryStatus: 'LEARNING', intervalStep: 2, correctWithoutCue: 4, correctWithCue: 2, unsureAttempts: 1, incorrectAttempts: 0 },
    { prompt: 'What month are we in?', correctAnswer: new Date().toLocaleDateString('en-US', { month: 'long' }), cueText: 'Look at a calendar or your phone.', category: 'ORIENTATION_DATE', masteryStatus: 'STRENGTHENING', intervalStep: 4, correctWithoutCue: 8, correctWithCue: 1, unsureAttempts: 0, incorrectAttempts: 0 },
    { prompt: 'What year is it?', correctAnswer: String(new Date().getFullYear()), cueText: null, category: 'ORIENTATION_DATE', masteryStatus: 'MASTERED', intervalStep: 5, correctWithoutCue: 12, correctWithCue: 0, unsureAttempts: 0, incorrectAttempts: 0 },
    { prompt: 'Where can you find your daily reminders?', correctAnswer: 'In the Reminders section of the app', cueText: 'Tap the alarm icon at the bottom of the screen.', category: 'APP_NAVIGATION', masteryStatus: 'LEARNING', intervalStep: 1, correctWithoutCue: 3, correctWithCue: 3, unsureAttempts: 1, incorrectAttempts: 1 },
    { prompt: 'What is the name of your primary caregiver?', correctAnswer: caregiverName.split(' ')[0] ?? 'Your caregiver', cueText: 'Their name is listed in your Contacts section.', category: 'PEOPLE_RECOGNITION', masteryStatus: 'MASTERED', intervalStep: 5, linkedContactId: seededContacts[0]?.id, supportRole: 'Primary Caregiver', correctWithoutCue: 15, correctWithCue: 1, unsureAttempts: 0, incorrectAttempts: 0 },
    { prompt: 'Who is Dr. Sameh?', correctAnswer: 'Your Doctor', cueText: 'He checks your health every month.', category: 'PEOPLE_RECOGNITION', masteryStatus: 'STRENGTHENING', intervalStep: 4, linkedContactId: seededContacts[1]?.id, supportRole: 'Doctor / Clinic', correctWithoutCue: 7, correctWithCue: 2, unsureAttempts: 1, incorrectAttempts: 0 },
    { prompt: 'What is your morning routine after breakfast?', correctAnswer: 'Check reminders, then follow the morning checklist', cueText: 'Check the morning checklist in the app.', category: 'DAILY_ROUTINE', masteryStatus: 'NEW', intervalStep: 0, correctWithoutCue: 1, correctWithCue: 1, unsureAttempts: 2, incorrectAttempts: 1 },
    { prompt: 'Where do you live?', correctAnswer: 'Cairo, Egypt', cueText: 'Your home city.', category: 'ORIENTATION_PLACE', masteryStatus: 'MASTERED', intervalStep: 5, correctWithoutCue: 14, correctWithCue: 0, unsureAttempts: 0, incorrectAttempts: 0 },
    { prompt: 'Who helps you with daily medicine reminders?', correctAnswer: caregiverName.split(' ')[0] ?? 'Your caregiver', cueText: 'Your primary caregiver.', category: 'SUPPORT_FACT', masteryStatus: 'MASTERED', intervalStep: 5, linkedContactId: seededContacts[0]?.id, supportRole: 'Primary Caregiver', correctWithoutCue: 10, correctWithCue: 1, unsureAttempts: 0, incorrectAttempts: 0 },
  ];

  const srItemsEnriched = [];
  for (const item of srItemsDataEnriched) {
    const now = new Date();
    const totalAttempts = item.correctWithoutCue + item.correctWithCue + item.unsureAttempts + item.incorrectAttempts;
    const correctAttempts = item.correctWithoutCue + item.correctWithCue;
    const srItem = await (prisma as any).spacedRetrievalItem.create({
      data: {
        patientId,
        createdByUserId: caregiverId,
        prompt: item.prompt,
        correctAnswer: item.correctAnswer,
        cueText: item.cueText,
        category: item.category,
        linkedContactId: item.linkedContactId ?? null,
        supportRole: item.supportRole ?? null,
        sensitive: false,
        patientVisible: true,
        masteryStatus: item.masteryStatus,
        currentIntervalStep: item.intervalStep,
        currentIntervalSeconds: [0,15,30,60,120,300,600][Math.min(item.intervalStep, 6)] ?? 0,
        active: true,
        totalAttempts,
        correctAttempts,
        correctWithoutCue: item.correctWithoutCue,
        correctWithCue: item.correctWithCue,
        unsureAttempts: item.unsureAttempts,
        incorrectAttempts: item.incorrectAttempts,
        lastPracticedAt: randomDateWithinLast(3),
        nextDueAt: new Date(now.getTime() + (item.masteryStatus === 'MASTERED' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
      }
    });
    srItemsEnriched.push(srItem);
  }

  // 9. Personal Orientation Practice Game Sessions (20–25 sessions over 30 days)
  const popSessionCount = 20 + Math.floor(Math.random() * 6);
  for (let i = 0; i < popSessionCount; i++) {
    const accuracy = 65 + Math.min(30, Math.floor(i * 1.5) + Math.floor(Math.random() * 15));
    const score = Math.round((accuracy / 100) * 600);
    const sessionDate = new Date(Date.now() - (30 - i * 1.2) * 24 * 60 * 60 * 1000);
    const isAbandoned = randomChance(5);

    await prisma.gameSession.create({
      data: {
        patientUserId: patientId,
        actorUserId: patientId,
        actorRole: 'patient',
        gameType: 'PERSONAL_ORIENTATION_PRACTICE',
        score,
        accuracyPercent: accuracy,
        status: isAbandoned ? 'ABANDONED' : 'COMPLETED',
        completed: !isAbandoned,
        quitEarly: isAbandoned,
        durationSeconds: 150 + Math.floor(Math.random() * 180),
        startedAt: new Date(sessionDate.getTime() - 1000 * 60 * 5),
        completedAt: isAbandoned ? null : sessionDate,
        metadata: { supportLevel: 'GUIDED_SUPPORT', correctWithoutCue: Math.floor(accuracy * 0.75 / 10), correctWithCue: Math.floor(accuracy * 0.25 / 10) },
      }
    });

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patientId,
        eventName: isAbandoned ? 'personal_orientation_session_abandoned' : 'personal_orientation_session_completed',
        payload: { score, accuracyPercent: accuracy, supportLevel: 'GUIDED_SUPPORT' },
        occurredAt: sessionDate,
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
