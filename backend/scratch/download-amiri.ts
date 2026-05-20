import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const url = 'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHqUp.ttf';
  try {
    console.log('Downloading Amiri font...');
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    console.log('Base64 length:', base64.length);
    
    const outputPath = path.join(process.cwd(), 'scratch', 'amiri-b64.txt');
    fs.writeFileSync(outputPath, base64);
    console.log('Saved base64 to:', outputPath);
  } catch (error) {
    console.error('Error downloading font:', error);
  }
}

run();
