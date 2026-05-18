import { generateSummaryPdfBuffer } from '../src/modules/summary-exports/service/pdf.service.js';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  try {
    console.log('Generating test PDF...');
    const buffer = await generateSummaryPdfBuffer({
      patientId: 'mock-patient-id',
      caregiverId: 'mock-caregiver-id',
      patientName: 'مريض تجريبي',
      caregiverName: 'مقدم رعاية تجريبي',
      rangeStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      rangeEnd: new Date(),
      sections: {
        importantInfo: true,
        reminders: true,
        checklists: true,
        games: true,
        patientRecords: true,
        timeline: true
      },
      language: 'ar'
    });

    const outputPath = path.join(process.cwd(), 'scratch', 'test-ar.pdf');
    fs.writeFileSync(outputPath, buffer);
    console.log('PDF generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

run();
