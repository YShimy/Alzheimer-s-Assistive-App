import PDFDocument from 'pdfkit';
import { prisma } from '../../../shared/db/prisma.js';
import { NOTO_ARABIC_REGULAR_B64, NOTO_ARABIC_BOLD_B64 } from '../../../assets/fonts/arabicFonts.js';
import { shapeArabicText } from 'naqqash';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

function shapeArabic(text: string | null | undefined, isAr: boolean, convertDigits = true): string {
  if (!isAr || !text) return text || '';
  let arText = convertDigits
    ? text.replace(/\d+/g, (match) =>
        new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(parseInt(match))
      )
    : text;
  arText = shapeArabicText(arText);
  const levels = bidi.getEmbeddingLevels(arText, 'rtl');
  const flips = bidi.getReorderSegments(arText, levels);
  const mirrored = bidi.getMirroredCharactersMap(arText, levels);
  let chars = Array.from(arText);
  if (mirrored.size > 0) {
    for (const [index, char] of mirrored.entries()) {
      chars[index] = char;
    }
  }
  flips.forEach(([start, end]) => {
    const slice = chars.slice(start, end + 1).reverse();
    chars.splice(start, slice.length, ...slice);
  });
  return chars.join('');
}

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
  language?: 'en' | 'ar';
};

const DICT = {
  en: {
    summary: 'Patient Summary',
    patient: 'Patient:',
    caregiver: 'Caregiver:',
    period: 'Period:',
    disclaimer: DISCLAIMER,
    importantInfo: 'Important Information',
    importantInfoDesc: 'Caregiver-provided information to support daily care and communication.',
    preferredName: 'Preferred Name',
    primaryLanguage: 'Primary Language',
    livingSituation: 'Living Situation',
    primaryCaregiver: 'Primary Caregiver',
    caregiverPhone: 'Caregiver Phone',
    emergencyContact: 'Emergency Contact',
    emergencyPhone: 'Emergency Phone',
    doctor: 'Doctor',
    doctorPhone: 'Doctor Phone',
    clinicHospital: 'Clinic / Hospital',
    allergies: 'Allergies (Ref)',
    medications: 'Medications (Ref)',
    dietaryNotes: 'Dietary Notes',
    commTips: 'Communication Tips',
    calmingStrat: 'Calming Strategies',
    emergInst: 'Emergency Instructions',
    remindersSum: 'Reminder Summary',
    totalReminders: 'Total reminder interactions',
    completed: 'Completed (Done)',
    snoozed: 'Snoozed',
    skipped: 'Skipped',
    completionRate: 'Completion rate',
    noReminders: 'No reminder activity in selected range.',
    routinesSum: 'Routine / Checklist Summary',
    routinesStarted: 'Routines started',
    routinesCompleted: 'Routines completed',
    mostUsedRoutines: 'MOST USED ROUTINES',
    noRoutines: 'No routine activity in selected range.',
    cogActivities: 'Cognitive Engagement Activities',
    cogNote: 'Note: The cognitive engagement section summarizes app-based practice activity. It is not a clinical cognitive assessment and should not be used to diagnose or measure disease progression.',
    assocMemory: 'Memory Match',
    sessionsCompleted: 'Sessions completed',
    avgScore: 'Average score',
    avgAccuracy: 'Average accuracy',
    highestLevel: 'Highest level reached',
    assocMemoryNote: 'This reflects app-based paired-association memory practice activity only.',
    srPractice: 'My Day & People',
    srNote: 'This reflects app-based daily orientation and personal recognition practice only.',
    historicalData: 'Historical Engagement Data',
    historicalSessions: 'Historical completed sessions',
    noEngagement: 'No engagement activity in selected range.',
    patientRecords: 'Patient Records Uploaded',
    recordsNote: 'Document file contents are not included. Only metadata is listed.',
    source: 'Source:',
    docDate: 'Document date:',
    uploaded: 'Uploaded:',
    noRecords: 'No records uploaded in selected range.',
    timeline: 'Activity Timeline',
    timelineNote: 'Only the most recent 50 timeline entries are shown.',
    generated: 'Generated',
    page: 'Page',
    of: 'of'
  },
  ar: {
    summary: 'ملخص المريض',
    patient: 'المريض:',
    caregiver: 'مقدم الرعاية:',
    period: 'الفترة:',
    disclaimer: 'يتم إنشاء هذا الملخص من نشاط التطبيق والمعلومات التي يدخلها مقدم الرعاية. الغرض منه هو تنظيم وتسهيل التواصل لمقدم الرعاية فقط، ولا يُعد تشخيصًا طبيًا أو تقييمًا سريريًا.',
    importantInfo: 'معلومات هامة',
    importantInfoDesc: 'المعلومات المقدمة من مقدم الرعاية لدعم الرعاية اليومية والتواصل.',
    preferredName: 'الاسم المفضل',
    primaryLanguage: 'اللغة الأساسية',
    livingSituation: 'الحالة المعيشية',
    primaryCaregiver: 'مقدم الرعاية الأساسي',
    caregiverPhone: 'هاتف مقدم الرعاية',
    emergencyContact: 'جهة اتصال للطوارئ',
    emergencyPhone: 'هاتف الطوارئ',
    doctor: 'الطبيب',
    doctorPhone: 'هاتف الطبيب',
    clinicHospital: 'العيادة / المستشفى',
    allergies: 'الحساسية (مرجع)',
    medications: 'الأدوية (مرجع)',
    dietaryNotes: 'ملاحظات غذائية',
    commTips: 'نصائح للتواصل',
    calmingStrat: 'استراتيجيات التهدئة',
    emergInst: 'تعليمات الطوارئ',
    remindersSum: 'ملخص التذكيرات',
    totalReminders: 'إجمالي تفاعلات التذكير',
    completed: 'مكتمل (تم)',
    snoozed: 'تم تأجيله',
    skipped: 'تم تخطيه',
    completionRate: 'معدل الإنجاز',
    noReminders: 'لا يوجد نشاط تذكير في النطاق المحدد.',
    routinesSum: 'ملخص الروتين / القوائم',
    routinesStarted: 'الروتينات التي بدأت',
    routinesCompleted: 'الروتينات المكتملة',
    mostUsedRoutines: 'الروتينات الأكثر استخداماً',
    noRoutines: 'لا يوجد نشاط روتيني في النطاق المحدد.',
    cogActivities: 'أنشطة المشاركة المعرفية',
    cogNote: 'ملاحظة: قسم المشاركة المعرفية يلخص نشاط الممارسة القائم على التطبيق. إنه ليس تقييماً معرفياً سريرياً ولا ينبغي استخدامه لتشخيص أو قياس تطور المرض.',
    assocMemory: 'مطابقة الذاكرة',
    sessionsCompleted: 'الجلسات المكتملة',
    avgScore: 'متوسط الدرجات',
    avgAccuracy: 'متوسط الدقة',
    highestLevel: 'أعلى مستوى تم الوصول إليه',
    assocMemoryNote: 'هذا يعكس نشاط ممارسة الذاكرة الترابطية القائم على التطبيق فقط.',
    srPractice: 'يومي وأشخاصي',
    srNote: 'هذا يعكس ممارسة التوجيه اليومي والتعرف الشخصي القائم على التطبيق فقط.',
    historicalData: 'بيانات المشاركة التاريخية',
    historicalSessions: 'الجلسات التاريخية المكتملة',
    noEngagement: 'لا يوجد نشاط مشاركة في النطاق المحدد.',
    patientRecords: 'سجلات المريض المرفوعة',
    recordsNote: 'محتويات ملف المستند غير مدرجة. يتم سرد البيانات الوصفية فقط.',
    source: 'المصدر:',
    docDate: 'تاريخ المستند:',
    uploaded: 'تم الرفع:',
    noRecords: 'لا توجد سجلات مرفوعة في النطاق المحدد.',
    timeline: 'الجدول الزمني للأنشطة',
    timelineNote: 'يتم عرض أحدث 50 إدخالًا فقط في الجدول الزمني.',
    generated: 'تم الإنشاء',
    page: 'صفحة',
    of: 'من'
  }
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

function formatDate(d: Date, isAr: boolean = false): string {
  return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(d: Date, isAr: boolean = false): string {
  return d.toLocaleString(isAr ? 'ar-EG' : 'en-US', {
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
  const isAr = title.match(/[\u0600-\u06FF]/);
  const fontName = isAr ? 'Arabic-Bold' : 'Helvetica-Bold';
  doc.fillColor(theme.primary)
     .fontSize(16)
     .font(fontName)
     .text(title, { align: isAr ? 'right' : 'left' });
  
  // No-line structural philosophy: Just spacing and color for hierarchy
  doc.moveDown(0.5);
  doc.fillColor(theme.text).font(isAr ? 'Arabic' : 'Helvetica').fontSize(11);
}

function writeField(doc: InstanceType<typeof PDFDocument>, label: string, value?: string | null, isAr: boolean = false) {
  if (!value) return;
  const fontBold = isAr ? 'Arabic-Bold' : 'Helvetica-Bold';
  const fontReg = isAr ? 'Arabic' : 'Helvetica';
  // Avoid toUpperCase on Arabic (no-op but safe), keep for Latin
  const labelDisplay = isAr ? label : label.toUpperCase();
  doc.font(fontBold).fillColor(theme.text_variant).fontSize(10).text(labelDisplay, { align: isAr ? 'right' : 'left' });
  doc.moveDown(0.3);
  doc.font(fontReg).fillColor(theme.text).fontSize(11).text(value, { align: isAr ? 'right' : 'left' });
  doc.moveDown(1);
}

function writeStatRow(doc: InstanceType<typeof PDFDocument>, label: string, value: string | number, isAr: boolean = false) {
  const fontBold = isAr ? 'Arabic-Bold' : 'Helvetica-Bold';
  const fontReg = isAr ? 'Arabic' : 'Helvetica';

  if (isAr) {
    // For RTL: render as a single shaped line "label : value" right-aligned.
    // Using continued:true in RTL causes PDFKit to lay out text LTR, so we combine into one call.
    const combined = `${label} : ${value}`;
    doc.font(fontBold).fillColor(theme.text).fontSize(11).text(combined, { align: 'right' });
  } else {
    doc.font(fontReg).fillColor(theme.text_variant).fontSize(11).text(label, { continued: true, align: 'left' });
    doc.font(fontBold).fillColor(theme.text).text(`: ${value}`);
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateSummaryPdfBuffer(opts: GeneratePdfOptions): Promise<Buffer> {
  const {
    patientId, caregiverId, patientName, caregiverName,
    rangeStart, rangeEnd, sections, language = 'en'
  } = opts;

  const t = DICT[language];

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
          select: { gameType: true, score: true, completed: true, status: true, levelsSucceeded: true, highestTierReached: true, highestLevel: true, accuracyPercent: true, startedAt: true },
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
  return new Promise((resolve, reject) => {
    // Add page buffers so we can easily add footers if needed, and nice margins
    const doc = new PDFDocument({ margin: 60, size: 'A4', bufferPages: true });
    
    const isAr = language === 'ar';
    let inTextOverride = false;
    const originalText = doc.text.bind(doc);
    (doc as any).text = function() {
      if (inTextOverride) {
        return originalText.apply(doc, arguments as any);
      }
      inTextOverride = true;
      if (arguments.length > 0 && typeof arguments[0] === 'string') {
        arguments[0] = shapeArabic(arguments[0], isAr);
      }
      const result = originalText.apply(doc, arguments as any);
      inTextOverride = false;
      return result;
    };

    // Register Arabic fonts from embedded base64 (works on Vercel serverless)
    try {
      const regularBuf = Buffer.from(NOTO_ARABIC_REGULAR_B64, 'base64');
      const boldBuf = Buffer.from(NOTO_ARABIC_BOLD_B64, 'base64');
      doc.registerFont('Arabic', regularBuf);
      doc.registerFont('Arabic-Bold', boldBuf);
    } catch (e) {
      console.warn('Could not register Arabic fonts, falling back', e);
      doc.registerFont('Arabic', 'Helvetica');
      doc.registerFont('Arabic-Bold', 'Helvetica-Bold');
    }

    const chunks: Buffer[] = [];
    const align = isAr ? 'right' : 'left';
    const fontBold = isAr ? 'Arabic-Bold' : 'Helvetica-Bold';
    const fontReg = isAr ? 'Arabic' : 'Helvetica';

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 120; // usable width given 60 margin each side

    // ── Cover / Header ─────────────────────────────────────────────────────────────
    doc.fillColor(theme.primary)
      .fontSize(28)
      .font(fontBold)
      .text(t.summary, { align });

    doc.fillColor(theme.text_variant)
      .fontSize(12)
      .font(fontReg)
      .text(`${APP_NAME} • ${formatDate(new Date(), isAr)}`, { align });

    doc.moveDown(2);

    // Metadata block
    let metaY = doc.y;
    doc.rect(doc.page.margins.left, metaY, W, 80).fill(theme.surface);
    doc.fillColor(theme.text).fontSize(11).font(fontReg);
    
    let textY = metaY + 16;
    const leftX = doc.page.margins.left + 20;
    const textW = W - 40;

    if (isAr) {
      // RTL: avoid continued:true — render each line as a single right-aligned string
      doc.font(fontBold).text(`${t.patient} ${patientName}`, leftX, textY, { width: textW, align: 'right' });
      doc.font(fontBold).text(`${t.caregiver} ${caregiverName}`, leftX, textY + 20, { width: textW, align: 'right' });
      doc.font(fontBold).text(`${t.period} ${formatDate(rangeStart, isAr)} – ${formatDate(rangeEnd, isAr)}`, leftX, textY + 40, { width: textW, align: 'right' });
    } else {
      doc.text(t.patient, leftX, textY, { continued: true }).font(fontBold).text(` ${patientName}`);
      doc.font(fontReg).text(t.caregiver, leftX, textY + 20, { continued: true }).font(fontBold).text(` ${caregiverName}`);
      doc.font(fontReg).text(t.period, leftX, textY + 40, { continued: true }).font(fontBold).text(` ${formatDate(rangeStart, isAr)} – ${formatDate(rangeEnd, isAr)}`);
    }

    doc.x = doc.page.margins.left;
    doc.y = metaY + 96; // Move cursor past the metadata block

    // Disclaimer block
    let discY = doc.y;
    doc.rect(doc.page.margins.left, discY, W, 50).fill(theme.surface_container);
    doc.fillColor(theme.text_variant).fontSize(9).font(fontReg);
    doc.text(t.disclaimer, leftX, discY + 14, { width: W - 40, align });

    doc.x = doc.page.margins.left;
    doc.y = discY + 66; // Move cursor past the disclaimer block

    let sectionNum = 1;

    // ── Important Information ──────────────────────────────────────────────
    if (sections.importantInfo && importantInfo) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.importantInfo}`);
      doc.font(fontReg).fontSize(10)
        .fillColor(theme.text_variant)
        .text(t.importantInfoDesc, { align });
      doc.moveDown(1.5);

      writeField(doc, t.preferredName, importantInfo.preferredName, isAr);
      writeField(doc, t.primaryLanguage, importantInfo.primaryLanguage, isAr);
      writeField(doc, t.livingSituation, importantInfo.livingSituation, isAr);
      writeField(doc, t.primaryCaregiver, importantInfo.primaryCaregiverName, isAr);
      writeField(doc, t.caregiverPhone, importantInfo.primaryCaregiverPhone, isAr);
      writeField(doc, t.emergencyContact, importantInfo.emergencyContactName, isAr);
      writeField(doc, t.emergencyPhone, importantInfo.emergencyContactPhone, isAr);
      writeField(doc, t.doctor, importantInfo.doctorName, isAr);
      writeField(doc, t.doctorPhone, importantInfo.doctorPhone, isAr);
      writeField(doc, t.clinicHospital, importantInfo.clinicOrHospitalName, isAr);
      writeField(doc, t.allergies, importantInfo.allergies, isAr);
      writeField(doc, t.medications, importantInfo.currentMedicationSummary, isAr);
      writeField(doc, t.dietaryNotes, importantInfo.dietaryNotes, isAr);
      writeField(doc, t.commTips, importantInfo.communicationTips, isAr);
      writeField(doc, t.calmingStrat, importantInfo.calmingStrategies, isAr);
      writeField(doc, t.emergInst, importantInfo.emergencyInstructions, isAr);
    }

    // ── Reminders ─────────────────────────────────────────────────────────
    if (sections.reminders && reminderStats.length > 0) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.remindersSum}`);

      const done = reminderStats.filter(e => e.eventType === 'DONE').length;
      const skipped = reminderStats.filter(e => e.eventType === 'SKIPPED').length;
      const snoozed = reminderStats.filter(e => e.eventType === 'SNOOZED').length;
      const fired = reminderStats.filter(e => e.eventType === 'FIRED').length;
      const total = fired || done + skipped + snoozed;
      const rate = total > 0 ? done / total : 0;

      writeStatRow(doc, t.totalReminders, reminderStats.length, isAr);
      writeStatRow(doc, t.completed, done, isAr);
      writeStatRow(doc, t.snoozed, snoozed, isAr);
      writeStatRow(doc, t.skipped, skipped, isAr);
      writeStatRow(doc, t.completionRate, pct(rate), isAr);
    } else if (sections.reminders) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.remindersSum}`);
      doc.fillColor(theme.text_variant).font(fontReg).text(t.noReminders, { align });
    }

    // ── Checklists ────────────────────────────────────────────────────────
    if (sections.checklists && checklistStats.length > 0) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.routinesSum}`);

      const completed = checklistStats.filter(r => r.status === 'COMPLETED').length;
      const rate = checklistStats.length > 0 ? completed / checklistStats.length : 0;

      writeStatRow(doc, t.routinesStarted, checklistStats.length, isAr);
      writeStatRow(doc, t.routinesCompleted, completed, isAr);
      writeStatRow(doc, t.completionRate, pct(rate), isAr);

      // Most used templates
      const templateCounts = new Map<string, number>();
      checklistStats.forEach(r => {
        const title = r.template?.title ?? 'Unknown';
        templateCounts.set(title, (templateCounts.get(title) ?? 0) + 1);
      });
      const sorted = [...templateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length > 0) {
        doc.moveDown(1);
        doc.font(fontBold).fillColor(theme.text_variant).fontSize(10).text(t.mostUsedRoutines, { align });
        doc.moveDown(0.3);
        doc.font(fontReg).fillColor(theme.text).fontSize(11);
        sorted.forEach(([title, count]) => doc.text(`• ${title}: ${count} time(s)`, { align }));
      }
    } else if (sections.checklists) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.routinesSum}`);
      doc.fillColor(theme.text_variant).font(fontReg).text(t.noRoutines, { align });
    }

    // ── Cognitive Engagement Activities ──────────────────────────────────
    if (sections.games && gameStats.length > 0) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.cogActivities}`);
      doc.font(fontReg).fontSize(9)
        .fillColor(theme.text_variant)
        .text(t.cogNote, { align });
      doc.moveDown(1.5);

      const mmStats = gameStats.filter(g => g.gameType === 'ASSOCIATIVE_MEMORY_MATCH');
      const srStats = gameStats.filter(g => g.gameType === 'SPACED_RETRIEVAL_ORIENTATION' || g.gameType === 'PERSONAL_ORIENTATION_PRACTICE');
      const legacyStats = gameStats.filter(g => g.gameType !== 'ASSOCIATIVE_MEMORY_MATCH' && g.gameType !== 'SPACED_RETRIEVAL_ORIENTATION' && g.gameType !== 'PERSONAL_ORIENTATION_PRACTICE');

      // Memory Match subsection
      if (mmStats.length > 0) {
        doc.font(fontBold).fillColor(theme.text).fontSize(11).text(t.assocMemory, { align });
        doc.moveDown(0.5);
        const mmCompleted = mmStats.filter(g => g.completed || g.status === 'COMPLETED').length;
        const mmScores = mmStats.map(g => g.score ?? 0).filter(s => s > 0);
        const mmAvgScore = mmScores.length > 0 ? Math.round(mmScores.reduce((a, b) => a + b, 0) / mmScores.length) : 0;
        const mmAccuracies = mmStats.map(g => g.accuracyPercent ?? 0).filter(a => a > 0);
        const mmAvgAccuracy = mmAccuracies.length > 0 ? Math.round(mmAccuracies.reduce((a, b) => a + b, 0) / mmAccuracies.length) : 0;
        const mmMaxLevel = Math.max(...mmStats.map(g => g.highestLevel ?? g.highestTierReached ?? 0));

        writeStatRow(doc, t.sessionsCompleted, mmCompleted, isAr);
        writeStatRow(doc, t.avgScore, mmAvgScore, isAr);
        if (mmAvgAccuracy > 0) writeStatRow(doc, t.avgAccuracy, `${mmAvgAccuracy}%`, isAr);
        if (mmMaxLevel > 0) writeStatRow(doc, t.highestLevel, mmMaxLevel, isAr);
        doc.font(fontReg).fontSize(9).fillColor(theme.text_variant)
          .text(t.assocMemoryNote, { align });
        doc.moveDown(1);
      }

      // Spaced Retrieval subsection
      if (srStats.length > 0) {
        doc.font(fontBold).fillColor(theme.text).fontSize(11).text(t.srPractice, { align });
        doc.moveDown(0.5);
        const srCompleted = srStats.filter(g => g.completed || g.status === 'COMPLETED').length;
        const srScores = srStats.map(g => g.score ?? 0).filter(s => s > 0);
        const srAvgScore = srScores.length > 0 ? Math.round(srScores.reduce((a, b) => a + b, 0) / srScores.length) : 0;
        const srAccuracies = srStats.map(g => g.accuracyPercent ?? 0).filter(a => a > 0);
        const srAvgAccuracy = srAccuracies.length > 0 ? Math.round(srAccuracies.reduce((a, b) => a + b, 0) / srAccuracies.length) : 0;

        writeStatRow(doc, t.sessionsCompleted, srCompleted, isAr);
        writeStatRow(doc, t.avgScore, srAvgScore, isAr);
        if (srAvgAccuracy > 0) writeStatRow(doc, t.avgAccuracy, `${srAvgAccuracy}%`, isAr);
        doc.font(fontReg).fontSize(9).fillColor(theme.text_variant)
          .text(t.srNote, { align });
        doc.moveDown(1);
      }

      // Legacy stats (hidden from new UI but included in PDF if historical data exists)
      if (legacyStats.length > 0) {
        doc.font(fontBold).fillColor(theme.text).fontSize(11).text(t.historicalData, { align });
        doc.moveDown(0.5);
        const legacyCompleted = legacyStats.filter(g => g.completed).length;
        writeStatRow(doc, t.historicalSessions, legacyCompleted, isAr);
        doc.moveDown(1);
      }
    } else if (sections.games) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.cogActivities}`);
      doc.fillColor(theme.text_variant).font(fontReg).text(t.noEngagement, { align });
    }

    // ── Patient Records ───────────────────────────────────────────────────
    if (sections.patientRecords && documents.length > 0) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.patientRecords}`);
      doc.font(fontReg).fontSize(9)
        .fillColor(theme.text_variant)
        .text(t.recordsNote, { align });
      doc.moveDown(1.5);

      documents.forEach(d => {
        if (isAr) {
          // RTL: avoid continued:true, render title and category on same line via combined string
          doc.font(fontBold).fillColor(theme.text).fontSize(11).text(`${d.title}  |  ${d.category}`, { align: 'right' });
        } else {
          doc.font(fontBold).fillColor(theme.text).fontSize(11).text(d.title, { continued: true, align: 'left' });
          doc.font(fontReg).fillColor(theme.text_variant).text(`  |  ${d.category}`);
        }
        doc.moveDown(0.2);

        doc.font(fontReg).fillColor(theme.text).fontSize(10);
        if (d.sourceName) doc.text(`${t.source} ${d.sourceName}`, { align });
        if (d.documentDate) doc.text(`${t.docDate} ${formatDate(d.documentDate, isAr)}`, { align });
        doc.text(`${t.uploaded} ${formatDate(d.createdAt, isAr)}`, { align });
        doc.moveDown(1);
      });
    } else if (sections.patientRecords) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.patientRecords}`);
      doc.fillColor(theme.text_variant).font(fontReg).text(t.noRecords, { align });
    }

    // ── Timeline ──────────────────────────────────────────────────────────
    if (sections.timeline && timelineEvents.length > 0) {
      writeSectionHeader(doc, `${sectionNum++}. ${t.timeline}`);
      if (timelineEvents.length === 50) {
        doc.font(fontReg).fontSize(9)
          .fillColor(theme.text_variant)
          .text(t.timelineNote, { align });
        doc.moveDown(1.5);
      }

      timelineEvents.forEach(ev => {
        const evLabel = ev.eventName.replace(/_/g, ' ');
        if (isAr) {
          // RTL: render datetime and label on same line without continued:true
          const actorPart = ev.actorRole ? ` (${ev.actorRole})` : '';
          doc.font(fontBold).fillColor(theme.text).fontSize(10)
            .text(`${formatDateTime(ev.occurredAt, isAr)}  —  ${evLabel}${actorPart}`, { align: 'right' });
        } else {
          doc.font(fontBold).fillColor(theme.text).fontSize(10).text(formatDateTime(ev.occurredAt, isAr), { continued: true, align: 'left' });
          doc.font(fontReg).fillColor(theme.text_variant).text(`  —  ${evLabel}` + (ev.actorRole ? ` (${ev.actorRole})` : ''));
        }
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
        .font(fontReg)
        .fillColor(theme.text_variant)
        .text(
          `${APP_NAME} • ${t.generated} ${formatDateTime(new Date(), isAr)} • ${t.page} ${i + 1} ${t.of} ${pages.count}`,
          60,
          range,
          { align: 'center', width: W },
        );
    }

    doc.end();
  });
}
