import { prisma, disconnectDatabase } from '../src/shared/db/prisma.js';

// Enums as string literals to match database definitions
const ReminderEventType = {
  DONE: 'DONE'
} as const;

const ChecklistRunStatus = {
  COMPLETED: 'COMPLETED'
} as const;

const GameSessionStatus = {
  COMPLETED: 'COMPLETED'
} as const;

const GAME_TYPES = {
  MEMORY_MATCH: 'ASSOCIATIVE_MEMORY_MATCH',
  SPACED_RETRIEVAL: 'PERSONAL_ORIENTATION_PRACTICE'
} as const;

async function enrichDemoData() {
  const email = 'demo.patient01@example.com';
  console.log(`🔍 Finding demo patient with email: ${email}...`);

  const patient = await prisma.user.findUnique({
    where: { email }
  });

  if (!patient) {
    console.error(`❌ Error: Demo patient with email ${email} not found.`);
    console.error('Please run the demo seed script first using: npm run db:seed:demo');
    process.exit(1);
  }

  console.log(`✅ Found patient: ${patient.displayName} (ID: ${patient.id})`);

  // Find caregiver link to obtain caregiver ID
  const careLink = await prisma.careLink.findFirst({
    where: { patientUserId: patient.id, status: 'ACTIVE' }
  });

  const caregiverId = careLink?.caregiverUserId ?? patient.id;
  console.log(`ℹ️ Associated Caregiver ID: ${caregiverId}`);

  console.log('🧹 Cleaning existing events/runs/sessions history for this patient...');
  await prisma.$transaction([
    prisma.reminderEvent.deleteMany({ where: { patientUserId: patient.id } }),
    prisma.checklistRun.deleteMany({ where: { patientUserId: patient.id } }),
    prisma.gameSession.deleteMany({ where: { patientUserId: patient.id } }),
    prisma.analyticsEvent.deleteMany({ where: { patientUserId: patient.id } })
  ]);
  console.log('✅ History cleaned.');

  console.log('📈 Seeding rich 7-day high-adherence data for perfect graphs...');

  // Get patient reminders and checklist templates
  const reminders = await prisma.reminder.findMany({
    where: { patientUserId: patient.id, isActive: true }
  });

  const checklistTemplates = await prisma.checklistTemplate.findMany({
    where: { patientUserId: patient.id, isActive: true }
  });

  console.log(`ℹ️ Found ${reminders.length} active reminders and ${checklistTemplates.length} active checklists.`);

  const now = new Date();
  
  // We populate data for the last 7 days (day 0 to day 6)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() - dayOffset);
    const dateString = targetDate.toISOString().split('T')[0];
    console.log(`   - Seeding day: ${dateString} (${dayOffset} days ago)...`);

    // 1. Reminders
    for (const rem of reminders) {
      // Parse scheduled time (HH:mm)
      const [hours, minutes] = rem.scheduledTime.split(':').map(Number);
      const eventTime = new Date(targetDate);
      eventTime.setHours(hours || 8, (minutes || 0) + Math.floor(Math.random() * 15) - 5, 0, 0);

      // Create ReminderEvent
      await prisma.reminderEvent.create({
        data: {
          reminderId: rem.id,
          patientUserId: patient.id,
          actorUserId: patient.id,
          actorRole: 'patient',
          eventType: ReminderEventType.DONE,
          timestamp: eventTime,
          source: 'notification',
          scheduledFor: eventTime
        }
      });

      // Create AnalyticsEvent
      await prisma.analyticsEvent.create({
        data: {
          patientUserId: patient.id,
          actorUserId: patient.id,
          eventName: 'reminder_done',
          occurredAt: eventTime,
          payload: { reminderId: rem.id, title: rem.title }
        }
      });
    }

    // 2. Checklist Runs
    for (const template of checklistTemplates) {
      const runTime = new Date(targetDate);
      if (template.category === 'MORNING') {
        runTime.setHours(8, 30 + Math.floor(Math.random() * 30), 0, 0);
      } else {
        runTime.setHours(20, 30 + Math.floor(Math.random() * 30), 0, 0);
      }

      const stepsArray = Array.isArray(template.steps) ? template.steps : [];
      const totalSteps = stepsArray.length || 4;

      await prisma.checklistRun.create({
        data: {
          checklistTemplateId: template.id,
          patientUserId: patient.id,
          actorUserId: patient.id,
          actorRole: 'patient',
          status: ChecklistRunStatus.COMPLETED,
          startedAt: new Date(runTime.getTime() - 1000 * 60 * 5),
          completedAt: runTime,
          totalStepsCount: totalSteps,
          completedStepsCount: totalSteps,
          durationSeconds: 200 + Math.floor(Math.random() * 160),
          startedFrom: 'home'
        }
      });

      await prisma.analyticsEvent.create({
        data: {
          patientUserId: patient.id,
          actorUserId: patient.id,
          eventName: 'checklist_completed',
          occurredAt: runTime,
          payload: { templateId: template.id, title: template.title }
        }
      });
    }

    // 3. Memory Match Sessions
    const mmTime = new Date(targetDate);
    mmTime.setHours(10, 15 + Math.floor(Math.random() * 45), 0, 0);
    const mmLevel = 4 + Math.floor(Math.random() * 5); // Level 4 to 8
    const mmAccuracy = 80 + Math.floor(Math.random() * 21); // 80% to 100%
    const mmScore = Math.round((mmAccuracy / 100) * mmLevel * 120);

    const mmSession = await prisma.gameSession.create({
      data: {
        patientUserId: patient.id,
        actorUserId: patient.id,
        actorRole: 'patient',
        gameType: GAME_TYPES.MEMORY_MATCH,
        status: GameSessionStatus.COMPLETED,
        completed: true,
        score: mmScore,
        accuracyPercent: mmAccuracy,
        levelStarted: Math.max(1, mmLevel - 2),
        levelCompleted: mmLevel,
        highestLevel: mmLevel,
        durationSeconds: 90 + Math.floor(Math.random() * 90),
        startedAt: new Date(mmTime.getTime() - 1000 * 60 * 3),
        completedAt: mmTime,
        source: 'home'
      }
    });

    // Create a few mock levels completed
    for (let lvl = 1; lvl <= mmLevel; lvl++) {
      await prisma.gameLevelResult.create({
        data: {
          sessionId: mmSession.id,
          levelIndex: lvl,
          difficultyTier: lvl,
          gridRows: lvl > 6 ? 4 : 3,
          gridCols: lvl > 6 ? 4 : 3,
          bombCount: 0,
          previewDurationMs: 2000,
          solveTimeMs: 12000 + Math.floor(Math.random() * 8000),
          success: true,
          scoreDelta: 100 + lvl * 10,
          startedAt: new Date(mmTime.getTime() - 1000 * 60 * (mmLevel - lvl + 1)),
          completedAt: new Date(mmTime.getTime() - 1000 * 60 * (mmLevel - lvl))
        }
      });
    }

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patient.id,
        actorUserId: patient.id,
        eventName: 'memory_match_session_completed',
        occurredAt: mmTime,
        payload: { score: mmScore, accuracyPercent: mmAccuracy, level: mmLevel }
      }
    });

    // 4. Personal Orientation Practice Sessions
    const srTime = new Date(targetDate);
    srTime.setHours(16, 30 + Math.floor(Math.random() * 45), 0, 0);
    const srAccuracy = 85 + Math.floor(Math.random() * 16); // 85% to 100%
    const srScore = Math.round((srAccuracy / 100) * 500);
    const cueRate = 10 + Math.floor(Math.random() * 20); // 10% to 30% hint rate

    await prisma.gameSession.create({
      data: {
        patientUserId: patient.id,
        actorUserId: patient.id,
        actorRole: 'patient',
        gameType: GAME_TYPES.SPACED_RETRIEVAL,
        status: GameSessionStatus.COMPLETED,
        completed: true,
        score: srScore,
        accuracyPercent: srAccuracy,
        durationSeconds: 120 + Math.floor(Math.random() * 80),
        startedAt: new Date(srTime.getTime() - 1000 * 60 * 4),
        completedAt: srTime,
        source: 'home',
        metadata: {
          supportLevel: 'GUIDED_SUPPORT',
          cueUseRate: cueRate / 100
        }
      }
    });

    await prisma.analyticsEvent.create({
      data: {
        patientUserId: patient.id,
        actorUserId: patient.id,
        eventName: 'personal_orientation_session_completed',
        occurredAt: srTime,
        payload: { score: srScore, accuracyPercent: srAccuracy }
      }
    });
  }

  console.log('\n=======================================');
  console.log(`🎉 Demo data for Omar Hassan successfully enriched.`);
  console.log(' Omar Hassan has now successfully completed:');
  console.log('   - 100% of all scheduled reminders');
  console.log('   - 100% of morning and evening checklists');
  console.log('   - Both Memory Match & Spaced Retrieval games');
  console.log(' ...every single day for the past 7 days!');
  console.log('=======================================\n');
}

enrichDemoData()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDatabase();
  });
