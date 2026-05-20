import * as fs from 'fs';
import * as path from 'path';

async function run() {
  try {
    const b64Path = path.join(process.cwd(), 'scratch', 'amiri-b64.txt');
    if (!fs.existsSync(b64Path)) {
      console.error('Base64 file not found!');
      return;
    }
    const b64 = fs.readFileSync(b64Path, 'utf8');
    
    const content = `// This file is auto-generated
export const NOTO_ARABIC_REGULAR_B64 = '${b64}';
export const NOTO_ARABIC_BOLD_B64 = '${b64}'; // Using same for bold for now
`;

    const outputPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'arabicFonts.ts');
    fs.writeFileSync(outputPath, content);
    console.log('Updated fonts file at:', outputPath);
  } catch (error) {
    console.error('Error updating fonts file:', error);
  }
}

run();
