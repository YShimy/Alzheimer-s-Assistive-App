import PDFDocument from 'pdfkit';
import { prisma } from '../../../shared/db/prisma.js';

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

// ─── Theme Tokens (Cognitive Sanctuary) ───────────────────────────────────────
const theme = {
  primary: '#3d6476',       // Deep oceanic blue
  secondary: '#346860',     // Sage green
  tertiary: '#7d5731',      // Earthy brown
  background: '#ffffff',    // Clean white paper
  surface: '#f9f9f7',       // Soft off-white
  surface_container: '#eceeec', 
  text: '#2f3332',          // Soft black
  text_variant: '#5c605e',  // Muted gray
  outline: '#afb3b0',       // Light border
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
  doc.moveDown(2);
  doc.fillColor(theme.primary)
     .fontSize(16)
     .font('Helvetica-Bold')
     .text(title);
  
  // No-line structural philosophy: Just spacing and color for hierarchy
  doc.moveDown(0.5);
  doc.fillColor(theme.text).font('Helvetica').fontSize(11);
}

function writeField(doc: InstanceType<typeof PDFDocument>, label: string, value?: string | null) {
  if (!value) return;
  // Editorial layout: Label in muted bold, value in regular
  doc.font('Helvetica-Bold').fillColor(theme.text_variant).fontSize(10).text(`${label.toUpperCase()}`, { continued: false });
  doc.moveDown(0.3);
  doc.font('Helvetica').fillColor(theme.text).fontSize(11).text(value);
  doc.moveDown(1);
}

function writeStatRow(doc: InstanceType<typeof PDFDocument>, label: string, value: string | number) {
  doc.font('Helvetica').fillColor(theme.text_variant).fontSize(11).text(`${label}: `, { continued: true });
  doc.font('Helvetica-Bold').fillColor(theme.text).text(String(value));
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
    // Add page buffers so we can easily add footers if needed, and nice margins
    const doc = new PDFDocument({ margin: 60, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 120; // usable width given 60 margin each side

    // ── Cover / Header ─────────────────────────────────────────────────────────────
    doc.fillColor(theme.primary)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('Patient Summary');

    doc.fillColor(theme.text_variant)
      .fontSize(12)
      .font('Helvetica')
      .text(`${APP_NAME} • ${formatDate(new Date())}`);

    doc.moveDown(2);

    // Metadata block
    let metaY = doc.y;
    doc.rect(doc.page.margins.left, metaY, W, 80).fill(theme.surface);
    doc.fillColor(theme.text).fontSize(11).font('Helvetica');
    
    let textY = metaY + 16;
    const leftX = doc.page.margins.left + 20;
    
    doc.text(`Patient:`, leftX, textY, { continued: true }).font('Helvetica-Bold').text(` ${patientName}`);
    doc.font('Helvetica').text(`Caregiver:`, leftX, textY + 20, { continued: true }).font('Helvetica-Bold').text(` ${caregiverName}`);
    doc.font('Helvetica').text(`Period:`, leftX, textY + 40, { continued: true }).font('Helvetica-Bold').text(` ${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`);

    doc.x = doc.page.margins.left;
    doc.y = metaY + 96; // Move cursor past the metadata block

    // Disclaimer block
    let discY = doc.y;
    doc.rect(doc.page.margins.left, discY, W, 50).fill(theme.surface_container);
    doc.fillColor(theme.text_variant).fontSize(9).font('Helvetica');
    doc.text(DISCLAIMER, leftX, discY + 14, { width: W - 40, align: 'left' });

    doc.x = doc.page.margins.left;
    doc.y = discY + 66; // Move cursor past the disclaimer block

    // ── Important Information ──────────────────────────────────────────────
    if (sections.importantInfo && importantInfo) {
      writeSectionHeader(doc, '1. Important Information');
      doc.font('Helvetica').fontSize(10)
        .fillColor(theme.text_variant)
        .text('Caregiver-provided information to support daily care and communication.');
      doc.moveDown(1.5);

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

      writeStatRow(doc, 'Total reminder interactions', reminderStats.length);
      writeStatRow(doc, 'Completed (Done)', done);
      writeStatRow(doc, 'Snoozed', snoozed);
      writeStatRow(doc, 'Skipped', skipped);
      writeStatRow(doc, 'Completion rate', pct(rate));
    } else if (sections.reminders) {
      writeSectionHeader(doc, '2. Reminder Summary');
      doc.fillColor(theme.text_variant).text('No reminder activity in selected range.');
    }

    // ── Checklists ────────────────────────────────────────────────────────
    if (sections.checklists && checklistStats.length > 0) {
      writeSectionHeader(doc, '3. Routine / Checklist Summary');

      const completed = checklistStats.filter(r => r.status === 'COMPLETED').length;
      const rate = checklistStats.length > 0 ? completed / checklistStats.length : 0;

      writeStatRow(doc, 'Routines started', checklistStats.length);
      writeStatRow(doc, 'Routines completed', completed);
      writeStatRow(doc, 'Completion rate', pct(rate));

      // Most used templates
      const templateCounts = new Map<string, number>();
      checklistStats.forEach(r => {
        const title = r.template?.title ?? 'Unknown';
        templateCounts.set(title, (templateCounts.get(title) ?? 0) + 1);
      });
      const sorted = [...templateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length > 0) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fillColor(theme.text_variant).fontSize(10).text('MOST USED ROUTINES');
        doc.moveDown(0.3);
        doc.font('Helvetica').fillColor(theme.text).fontSize(11);
        sorted.forEach(([title, count]) => doc.text(`• ${title}: ${count} time(s)`));
      }
    } else if (sections.checklists) {
      writeSectionHeader(doc, '3. Routine / Checklist Summary');
      doc.fillColor(theme.text_variant).text('No routine activity in selected range.');
    }

    // ── Games ─────────────────────────────────────────────────────────────
    if (sections.games && gameStats.length > 0) {
      writeSectionHeader(doc, '4. Engagement Activities Summary');
      doc.font('Helvetica').fontSize(9)
        .fillColor(theme.text_variant)
        .text('Note: Engagement data reflects app activity only and does not represent a clinical assessment.');
      doc.moveDown(1.5);

      const completedSessions = gameStats.filter(g => g.completed).length;
      const scores = gameStats.map(g => g.score ?? 0).filter(s => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      writeStatRow(doc, 'Total sessions', gameStats.length);
      writeStatRow(doc, 'Completed sessions', completedSessions);
      if (avgScore > 0) writeStatRow(doc, 'Average score', avgScore);

      const maxTier = Math.max(...gameStats.map(g => g.highestTierReached ?? 0));
      if (maxTier > 0) writeStatRow(doc, 'Highest difficulty tier reached', maxTier);
    } else if (sections.games) {
      writeSectionHeader(doc, '4. Engagement Activities Summary');
      doc.fillColor(theme.text_variant).text('No engagement activity in selected range.');
    }

    // ── Patient Records ───────────────────────────────────────────────────
    if (sections.patientRecords && documents.length > 0) {
      writeSectionHeader(doc, '5. Patient Records Uploaded');
      doc.font('Helvetica').fontSize(9)
        .fillColor(theme.text_variant)
        .text('Document file contents are not included. Only metadata is listed.');
      doc.moveDown(1.5);

      documents.forEach(d => {
        doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(11).text(d.title, { continued: true });
        doc.font('Helvetica').fillColor(theme.text_variant).text(`  |  ${d.category}`);
        doc.moveDown(0.2);
        
        doc.font('Helvetica').fillColor(theme.text).fontSize(10);
        if (d.sourceName) doc.text(`Source: ${d.sourceName}`);
        if (d.documentDate) doc.text(`Document date: ${formatDate(d.documentDate)}`);
        doc.text(`Uploaded: ${formatDate(d.createdAt)}`);
        doc.moveDown(1);
      });
    } else if (sections.patientRecords) {
      writeSectionHeader(doc, '5. Patient Records Uploaded');
      doc.fillColor(theme.text_variant).text('No records uploaded in selected range.');
    }

    // ── Timeline ──────────────────────────────────────────────────────────
    if (sections.timeline && timelineEvents.length > 0) {
      writeSectionHeader(doc, '6. Activity Timeline');
      if (timelineEvents.length === 50) {
        doc.font('Helvetica').fontSize(9)
          .fillColor(theme.text_variant)
          .text('Only the most recent 50 timeline entries are shown.');
        doc.moveDown(1.5);
      }

      timelineEvents.forEach(ev => {
        const evLabel = ev.eventName.replace(/_/g, ' ');
        doc.font('Helvetica-Bold').fillColor(theme.text).fontSize(10).text(`${formatDateTime(ev.occurredAt)}`, { continued: true });
        doc.font('Helvetica').fillColor(theme.text_variant).text(`  —  ${evLabel}` + (ev.actorRole ? ` (${ev.actorRole})` : ''));
        doc.moveDown(0.5);
      });
    }

    // ── Global Footer ────────────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      const range = doc.page.height - 40;
      doc.page.margins.bottom = 0;
      
      doc.moveTo(60, range - 10)
         .lineTo(doc.page.width - 60, range - 10)
         .strokeColor(theme.outline)
         .stroke();

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(theme.text_variant)
        .text(
          `${APP_NAME} • Generated ${formatDateTime(new Date())} • Page ${i + 1} of ${pages.count}`,
          60,
          range,
          { align: 'center', width: W },
        );
    }

    doc.end();
  });
}
