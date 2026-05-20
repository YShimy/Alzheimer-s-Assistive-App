import { shapeArabicText } from 'naqqash';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

function shapeArabicOld(text: string): string {
  let arText = shapeArabicText(text);
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

function shapeArabicNew(text: string): string {
  let arText = shapeArabicText(text);
  const embeddingLevels = bidi.getEmbeddingLevels(arText, 'rtl');
  const flips = bidi.getReorderSegments(arText, embeddingLevels);
  const mirrored = bidi.getMirroredCharactersMap(arText, embeddingLevels);
  let chars = Array.from(arText);
  if (mirrored.size > 0) {
    for (const [index, char] of mirrored.entries()) {
      chars[index] = char;
    }
  }
  // Sort segments right-to-left to avoid index shifting
  const sortedFlips = [...flips].sort((a, b) => b[0] - a[0]);
  sortedFlips.forEach(([start, end]) => {
    const slice = chars.slice(start, end + 1).reverse();
    chars.splice(start, slice.length, ...slice);
  });
  let result = chars.join('');
  // Fallback: if no segments returned, reverse whole string for PDFKit
  if (flips.length === 0 && /[\u0600-\u06FF\uFE70-\uFEFF]/.test(result)) {
    result = Array.from(result).reverse().join('');
  }
  return result;
}

const testCases = [
  'ملخص المريض',
  'المريض: أحمد',
  'مكتمل (تم)',
  'معدل الإنجاز',
  'الفترة: ١ يناير ٢٠٢٥ – ١ فبراير ٢٠٢٥',
  'إجمالي تفاعلات التذكير : 25',
  'Cognitive Support App • ١ يناير ٢٠٢٥',
];

console.log('=== Testing Arabic text shaping ===\n');
for (const tc of testCases) {
  console.log(`Input:  "${tc}"`);
  
  const shaped = shapeArabicText(tc);
  console.log(`Shaped: "${shaped}"`);
  
  const levels = bidi.getEmbeddingLevels(shaped, 'rtl');
  const flips = bidi.getReorderSegments(shaped, levels);
  console.log(`Flips:  ${JSON.stringify(flips)}`);
  
  const oldResult = shapeArabicOld(tc);
  const newResult = shapeArabicNew(tc);
  console.log(`Old:    "${oldResult}"`);
  console.log(`New:    "${newResult}"`);
  console.log(`Match:  ${oldResult === newResult}`);
  console.log('');
}
