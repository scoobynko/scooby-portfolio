import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ASCII characters from darkest to lightest
const ASCII_CHARS = '@%#*+=-:. ';

async function generateAscii() {
  const imagePath = join(__dirname, '../public/scooby_face.png');

  // Get original image dimensions
  const metadata = await sharp(imagePath).metadata();
  const aspectRatio = metadata.width / metadata.height;

  // Set width, calculate height to maintain aspect ratio
  const width = 80;
  const height = Math.round(width / aspectRatio);

  // Read and resize image - use 'fill' to get exact dimensions without cropping
  const { data, info } = await sharp(imagePath)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const asciiData = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // If transparent or very light (background), use space
      if (a < 128 || (r > 245 && g > 245 && b > 245)) {
        row.push({ char: ' ', brightness: 255, isBackground: true });
      } else {
        // Calculate brightness
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
        const char = ASCII_CHARS[charIndex];
        row.push({ char, brightness: Math.round(brightness), isBackground: false });
      }
    }
    asciiData.push(row);
  }

  // Add padding to each row first, then apply shoulder taper
  const taperStartRow = Math.floor(height * 0.65); // Start tapering at 65% down
  const maxTaper = 18; // Maximum characters to extend outward (wider angle)
  const padding = maxTaper; // Add padding columns on each side

  // First, add padding columns to all rows
  for (let y = 0; y < height; y++) {
    const row = asciiData[y];
    const leftPadding = Array(padding).fill(null).map(() => ({ char: ' ', brightness: 255, isBackground: true }));
    const rightPadding = Array(padding).fill(null).map(() => ({ char: ' ', brightness: 255, isBackground: true }));
    asciiData[y] = [...leftPadding, ...row, ...rightPadding];
  }

  // Now apply taper effect on rows in shoulder area
  for (let y = 0; y < height; y++) {
    const row = asciiData[y];

    if (y >= taperStartRow) {
      // Find leftmost and rightmost non-background character
      let leftEdge = -1;
      let rightEdge = -1;

      for (let x = 0; x < row.length; x++) {
        if (!row[x].isBackground) {
          if (leftEdge === -1) leftEdge = x;
          rightEdge = x;
        }
      }

      if (leftEdge !== -1 && rightEdge !== -1) {
        const progress = (y - taperStartRow) / (height - taperStartRow); // 0 to 1
        const taperAmount = Math.ceil(progress * maxTaper);
        const chars = ['.', ':', '+', '*', '#'];

        // Extend left edge outward with fading characters
        for (let i = 1; i <= taperAmount; i++) {
          const targetX = leftEdge - i;
          if (targetX >= 0 && row[targetX].isBackground) {
            const intensity = 1 - (i / taperAmount); // Fades outward
            const charIndex = Math.min(Math.floor(intensity * chars.length), chars.length - 1);
            row[targetX] = { char: chars[charIndex], brightness: 180, isBackground: false };
          }
        }

        // Extend right edge outward with fading characters
        for (let i = 1; i <= taperAmount; i++) {
          const targetX = rightEdge + i;
          if (targetX < row.length && row[targetX].isBackground) {
            const intensity = 1 - (i / taperAmount); // Fades outward
            const charIndex = Math.min(Math.floor(intensity * chars.length), chars.length - 1);
            row[targetX] = { char: chars[charIndex], brightness: 180, isBackground: false };
          }
        }
      }
    }
  }

  // Save as JSON
  const outputPath = join(__dirname, '../public/ascii-data.json');
  writeFileSync(outputPath, JSON.stringify(asciiData, null, 2));

  console.log(`ASCII data generated: ${width}x${height} characters`);
  console.log(`Saved to: ${outputPath}`);

  // Also print preview
  console.log('\nPreview:');
  asciiData.slice(0, 20).forEach(row => {
    console.log(row.map(c => c.char).join(''));
  });
}

generateAscii().catch(console.error);
