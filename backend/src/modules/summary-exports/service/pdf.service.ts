import PDFDocument from 'pdfkit';
import { prisma } from '../../../shared/db/prisma.js';
// PatientImportantInfo type not needed at runtime — data is fetched via prisma

const DISCLAIMER =
  'This summary is generated from app activity and caregiver-entered information. ' +
  'It is intended for caregiver organization and communication support only and is not a ' +
  'medical diagnosis or clinical assessment.';

const APP_NAME = 'Cognitive Support App';

type SectionFlags = {
  importantInfo?: boolean;
  reminders?: boolean;
  checklists?: boolean;
  games?: boolean;
  patientRecords?: boolean;
  timeline?: boolean;
};

type GeneratePdfOptions = {
  patientId: string;
  caregiverId: string;
  patientName: string;
  caregiverName: string;
  rangeStart: Date;
  rangeEnd: Date;
  sections: SectionFlags;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ─── Section writers ──────────────────────────────────────────────────────────

function writeSectionHeader(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(0.5);
  doc
    .fillColor('#1a237e')
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(title);
  doc
    .moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor('#3949ab')
    .stroke();
  doc.fillColor('#212121').font('Helvetica').fontSize(10);
  doc.moveDown(0.5);
}

function writeField(doc: InstanceType<typeof PDFDocument>, label: string, value?: string | null) {
  if (!value) return;
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value);
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateSummaryPdfBuffer(opts: GeneratePdfOptions): Promise<Buffer> {
  const {
    patientId, caregiverId, patientName, caregiverName,
    rangeStart, rangeEnd, sections,
  } = opts;

  // ── Fetch all needed data ─────────────────────────────────────────────────
  const [
    importantInfo,
    reminderStats,
    checklistStats,
    gameStats,
    documents,
    timelineEvents,
  ] = await Promise.all([
    sections.importantInfo
      ? prisma.patientImportantInfo.findUnique({ where: { patientId } })
      : Promise.resolve(null),
    sections.reminders
      ? prisma.reminderEvent.findMany({
          where: { patientUserId: patientId, timestamp: { gte: rangeStart, lte: rangeEnd } },
          select: { eventType: true, timestamp: true },
        })
      : Promise.resolve([]),
    sections.checklists
      ? prisma.checklistRun.findMany({
          where: { patientUserId: patientId, createdAt: { gte: rangeStart, lte: rangeEnd } },
          include: { template: { select: { title: true, category: true } } },
        })
      : Promise.resolve([]),
    sections.games
      ? prisma.gameSession.findMany({
          where: { patientUserId: patientId, startedAt: { gte: rangeStart, lte: rangeEnd } },
          select: { gameType: true, score: true, completed: true, levelsSucceeded: true, highestTierReached: true, startedAt: true },
        })
      : Promise.resolve([]),
    sections.patientRecords
      ? prisma.patientDocument.findMany({
          where: { patientId, status: 'ACTIVE', createdAt: { gte: rangeStart, lte: rangeEnd } },
          select: { title: true, category: true, documentDate: true, sourceName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    sections.timeline
      ? prisma.analyticsEvent.findMany({
          where: { patientUserId: patientId, occurredAt: { gte: rangeStart, lte: rangeEnd } },
          orderBy: { occurredAt: 'desc' },
          take: 50,
          select: { eventName: true, occurredAt: true, actorRole: true },
        })
      : Promise.resolve([]),
  ]);

  // ── Build PDF ─────────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width

    // ── Cover ─────────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 120)
      .fill('#1a237e');

    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(APP_NAME, 50, 30, { align: 'center', width: W });

    doc
      .fontSize(14)
      .text('Patient Activity Summary', 50, 60, { align: 'center', width: W });

    doc.fillColor('#212121').moveDown(4);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Patient: ${patientName}`);
    doc.text(`Date Range: ${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`);
    doc.text(`Generated: ${formatDateTime(new Date())}`);
    doc.text(`Generated by: ${caregiverName}`);

    doc.moveDown(0.5);
    doc
      .rect(50, doc.y, W, 40)
      .fill('#e8eaf6');
    doc
      .fillColor('#37474f')
      .fontSize(8)
      .font('Helvetica')
      .text(DISCLAIMER, 58, doc.y + 5, { width: W - 16 });
    doc.fillColor('#212121').fontSize(10).moveDown(0.8);

    // ── Important Information ──────────────────────────────────────────────
    if (sections.importantInfo && importantInfo) {
      writeSectionHeader(doc, '1. Patient Information');
      doc.font('Helvetica').fontSize(9)
        .text('Caregiver-provided information to support daily care and communication.', { color: '#546e7a' } as any);
      doc.moveDown(0.3);

      writeField(doc, 'Preferred Name', importantInfo.preferredName);
      writeField(doc, 'Primary Language', importantInfo.primaryLanguage);
      writeField(doc, 'Living Situation', importantInfo.livingSituation);
      writeField(doc, 'Primary Caregiver', importantInfo.primaryCaregiverName);
      writeField(doc, 'Caregiver Phone', importantInfo.primaryCaregiverPhone);
      writeField(doc, 'Emergency Contact', importantInfo.emergencyContactName);
      writeField(doc, 'Emergency Phone', importantInfo.emergencyContactPhone);
      writeField(doc, 'Doctor', importantInfo.doctorName);
      writeField(doc, 'Doctor Phone', importantInfo.doctorPhone);
      writeField(doc, 'Clinic / Hospital', importantInfo.clinicOrHospitalName);
      writeField(doc, 'Allergies (Ref)', importantInfo.allergies);
      writeField(doc, 'Medications (Ref)', importantInfo.currentMedicationSummary);
      writeField(doc, 'Dietary Notes', importantInfo.dietaryNotes);
      writeField(doc, 'Communication Tips', importantInfo.communicationTips);
      writeField(doc, 'Calming Strategies', importantInfo.calmingStrategies);
      writeField(doc, 'Emergency Instructions', importantInfo.emergencyInstructions);
    }

    // ── Reminders ─────────────────────────────────────────────────────────
    if (sections.reminders && reminderStats.length > 0) {
      writeSectionHeader(doc, '2. Reminder Summary');

      const done = reminderStats.filter(e => e.eventType === 'DONE').length;
      const skipped = reminderStats.filter(e => e.eventType === 'SKIPPED').length;
      const snoozed = reminderStats.filter(e => e.eventType === 'SNOOZED').length;
      const fired = reminderStats.filter(e => e.eventType === 'FIRED').length;
      const total = fired || done + skipped + snoozed;
      const rate = total > 0 ? done / total : 0;

      doc.text(`Total reminder interactions: ${reminderStats.length}`);
      doc.text(`Completed (Done): ${done}`);
      doc.text(`Snoozed: ${snoozed}`);
      doc.text(`Skipped: ${skipped}`);
      doc.text(`Completion rate: ${pct(rate)}`);
    } else if (sections.reminders) {
      writeSectionHeader(doc, '2. Reminder Summary');
      doc.text('No reminder activity in selected range.');
    }

    // ── Checklists ────────────────────────────────────────────────────────
    if (sections.checklists && checklistStats.length > 0) {
      writeSectionHeader(doc, '3. Routine / Checklist Summary');

      const completed = checklistStats.filter(r => r.status === 'COMPLETED').length;
      const rate = checklistStats.length > 0 ? completed / checklistStats.length : 0;

      doc.text(`Routines started: ${checklistStats.length}`);
      doc.text(`Routines completed: ${completed}`);
      doc.text(`Completion rate: ${pct(rate)}`);

      // Most used templates
      const templateCounts = new Map<string, number>();
      checklistStats.forEach(r => {
        const title = r.template?.title ?? 'Unknown';
        templateCounts.set(title, (templateCounts.get(title) ?? 0) + 1);
      });
      const sorted = [...templateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Most used routines:');
        doc.font('Helvetica');
        sorted.forEach(([title, count]) => doc.text(`  • ${title}: ${count} time(s)`));
      }
    } else if (sections.checklists) {
      writeSectionHeader(doc, '3. Routine / Checklist Summary');
      doc.text('No routine activity in selected range.');
    }

    // ── Games ─────────────────────────────────────────────────────────────
    if (sections.games && gameStats.length > 0) {
      writeSectionHeader(doc, '4. Engagement Activities Summary');
      doc.fontSize(9).text('Note: Engagement data reflects app activity only and does not represent a clinical assessment.', { color: '#546e7a' } as any);
      doc.fontSize(10).moveDown(0.3);

      const completedSessions = gameStats.filter(g => g.completed).length;
      const scores = gameStats.map(g => g.score ?? 0).filter(s => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      doc.text(`Total sessions: ${gameStats.length}`);
      doc.text(`Completed sessions: ${completedSessions}`);
      if (avgScore > 0) doc.text(`Average score: ${avgScore}`);

      const maxTier = Math.max(...gameStats.map(g => g.highestTierReached ?? 0));
      if (maxTier > 0) doc.text(`Highest difficulty tier reached: ${maxTier}`);
    } else if (sections.games) {
      writeSectionHeader(doc, '4. Engagement Activities Summary');
      doc.text('No engagement activity in selected range.');
    }

    // ── Patient Records ───────────────────────────────────────────────────
    if (sections.patientRecords && documents.length > 0) {
      writeSectionHeader(doc, '5. Patient Records Uploaded');
      doc.fontSize(9).text('Document file contents are not included. Only metadata is listed.', { color: '#546e7a' } as any);
      doc.fontSize(10).moveDown(0.3);

      documents.forEach(d => {
        doc.font('Helvetica-Bold').text(d.title, { continued: true });
        doc.font('Helvetica').text(` [${d.category}]`);
        if (d.sourceName) doc.text(`  Source: ${d.sourceName}`);
        if (d.documentDate) doc.text(`  Document date: ${formatDate(d.documentDate)}`);
        doc.text(`  Uploaded: ${formatDate(d.createdAt)}`);
        doc.moveDown(0.2);
      });
    } else if (sections.patientRecords) {
      writeSectionHeader(doc, '5. Patient Records Uploaded');
      doc.text('No records uploaded in selected range.');
    }

    // ── Timeline ──────────────────────────────────────────────────────────
    if (sections.timeline && timelineEvents.length > 0) {
      writeSectionHeader(doc, '6. Activity Timeline');
      if (timelineEvents.length === 50) {
        doc.fontSize(9).text('Only the most recent 50 timeline entries are shown.', { color: '#546e7a' } as any);
        doc.fontSize(10).moveDown(0.2);
      }

      timelineEvents.forEach(ev => {
        const evLabel = ev.eventName.replace(/_/g, ' ');
        doc.text(`${formatDateTime(ev.occurredAt)}  •  ${evLabel}` + (ev.actorRole ? ` (${ev.actorRole})` : ''));
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const range = doc.page.height - 40;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(8)
      .fillColor('#9e9e9e')
      .text(
        `${APP_NAME} • Generated ${formatDateTime(new Date())} • Caregiver summary only — not a medical report`,
        50,
        range,
        { align: 'center', width: W },
      );

    doc.end();
  });
}
