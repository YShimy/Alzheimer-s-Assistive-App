import ArabicReshaper from 'arabic-reshaper';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

function shapeArabic(text, isAr) {
  if (!isAr || !text) return text;
  
  // Reshape and numbers
  let arText = text.replace(/\d+/g, (match) => {
    return new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(parseInt(match));
  });
  arText = ArabicReshaper.convertArabic(arText);

  // Bidi reverse
  const levels = bidi.getEmbeddingLevels(arText, 'rtl');
  const flips = bidi.getReorderSegments(arText, levels);
  const mirrored = bidi.getMirroredCharactersMap(arText, levels);
  
  let chars = Array.from(arText);
  
  // Apply mirroring
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

console.log(shapeArabic('Cognitive Support App 2026', true));
console.log(shapeArabic('المريض: Patient Name 123', true));
