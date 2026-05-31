import { prisma } from '../src/shared/db/prisma.js';

const emailToDelete = 'youssef.elshimyy@gmail.com';

async function main() {
  console.log(`Starting deletion process for: ${emailToDelete}`);

  // 1. Delete email verifications for this email
  const verificationDelete = await prisma.emailVerification.deleteMany({
    where: { email: emailToDelete }
  });
  console.log(`Deleted ${verificationDelete.count} email verification codes.`);

  // 2. Find the user
  const user = await prisma.user.findUnique({
    where: { email: emailToDelete }
  });

  if (!user) {
    console.log(`User with email ${emailToDelete} not found in the database. No further action needed.`);
    return;
  }

  const userId = user.id;
  console.log(`Found user: ${user.displayName} (ID: ${userId}, Role: ${user.role})`);

  // 3. Delete dependent records sequentially to satisfy foreign key constraints

  // Notification devices
  const deletedDevices = await prisma.device.deleteMany({ where: { userId } });
  console.log(`Deleted ${deletedDevices.count} devices.`);

  // Notifications
  const deletedNotifications = await prisma.notification.deleteMany({ where: { userId } });
  console.log(`Deleted ${deletedNotifications.count} notifications.`);

  // PatientImportantInfo
  const deletedInfo = await prisma.patientImportantInfo.deleteMany({
    where: { OR: [{ patientId: userId }, { updatedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedInfo.count} patient important info cards.`);

  // PersonalOrientationSettings
  const deletedPOSettings = await prisma.personalOrientationSettings.deleteMany({
    where: { OR: [{ patientId: userId }, { updatedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedPOSettings.count} personal orientation settings.`);

  // ContactSupportConsent
  const deletedConsents = await prisma.contactSupportConsent.deleteMany({ where: { patientUserId: userId } });
  console.log(`Deleted ${deletedConsents.count} contact support consents.`);

  // ContactMemo & PatientContact
  const deletedMemos = await prisma.contactMemo.deleteMany({
    where: { OR: [{ patientUserId: userId }, { createdByUserId: userId }] }
  });
  console.log(`Deleted ${deletedMemos.count} contact memos.`);

  const deletedContacts = await prisma.patientContact.deleteMany({ where: { patientUserId: userId } });
  console.log(`Deleted ${deletedContacts.count} patient contacts.`);

  // Spaced Retrieval Items
  const deletedSRItems = await prisma.spacedRetrievalItem.deleteMany({
    where: { OR: [{ patientId: userId }, { createdByUserId: userId }] }
  });
  console.log(`Deleted ${deletedSRItems.count} spaced retrieval items.`);

  // PatientDocument
  const deletedDocs = await prisma.patientDocument.deleteMany({
    where: { OR: [{ patientId: userId }, { uploadedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedDocs.count} patient documents.`);

  // PatientSummaryExport
  // Check if PatientSummaryExport exists in Prisma schema (we saw it in User relations)
  try {
    // @ts-ignore
    const deletedExports = await prisma.patientSummaryExport.deleteMany({
      where: { OR: [{ patientId: userId }, { generatedByUserId: userId }] }
    });
    console.log(`Deleted ${deletedExports.count} patient summary exports.`);
  } catch (err: any) {
    console.log("Skipping patientSummaryExport deletion: table might not be in db/schema or named differently.");
  }

  // Checklist runs & templates
  const deletedChecklistRuns = await prisma.checklistRun.deleteMany({
    where: { OR: [{ patientUserId: userId }, { actorUserId: userId }] }
  });
  console.log(`Deleted ${deletedChecklistRuns.count} checklist runs.`);

  const deletedChecklistTemplates = await prisma.checklistTemplate.deleteMany({
    where: { OR: [{ patientUserId: userId }, { createdByUserId: userId }, { lastEditedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedChecklistTemplates.count} checklist templates.`);

  // Reminder events & reminders
  const deletedReminderEvents = await prisma.reminderEvent.deleteMany({
    where: { OR: [{ patientUserId: userId }, { actorUserId: userId }] }
  });
  console.log(`Deleted ${deletedReminderEvents.count} reminder events.`);

  const deletedReminders = await prisma.reminder.deleteMany({
    where: { OR: [{ patientUserId: userId }, { createdByUserId: userId }, { lastEditedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedReminders.count} reminders.`);

  // Game level results & Game sessions
  // Since GameLevelResult and GameItemResult have Cascade onDelete on GameSession in Prisma schema,
  // deleting the GameSession will automatically delete the related level and item results.
  const deletedGameSessions = await prisma.gameSession.deleteMany({
    where: { OR: [{ patientUserId: userId }, { actorUserId: userId }] }
  });
  console.log(`Deleted ${deletedGameSessions.count} game sessions.`);

  // Analytics events
  const deletedAnalytics = await prisma.analyticsEvent.deleteMany({
    where: { OR: [{ patientUserId: userId }, { actorUserId: userId }] }
  });
  console.log(`Deleted ${deletedAnalytics.count} analytics events.`);

  // Media assets
  const deletedAssets = await prisma.mediaAsset.deleteMany({
    where: { OR: [{ ownerUserId: userId }, { uploadedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedAssets.count} media assets.`);

  // CareLinks (Invite codes linked to this user)
  const deletedCareLinks = await prisma.careLink.deleteMany({
    where: { OR: [{ patientUserId: userId }, { caregiverUserId: userId }, { invitedByUserId: userId }] }
  });
  console.log(`Deleted ${deletedCareLinks.count} care links.`);

  // 4. Finally, delete the User record
  await prisma.user.delete({
    where: { id: userId }
  });
  console.log(`User ${emailToDelete} successfully deleted from the database.`);
}

main()
  .catch((e) => {
    console.error('Error during deletion:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
