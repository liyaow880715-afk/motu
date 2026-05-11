const fs = require('fs');
const path = require('path');

const baseDir = 'remotion/public/product-images';
const sections = fs.readdirSync(baseDir)
  .filter(s => fs.statSync(path.join(baseDir, s)).isDirectory())
  .sort();

const images = [];
sections.forEach((section) => {
  const files = fs.readdirSync(path.join(baseDir, section))
    .filter(f => f.endsWith('.png'))
    .sort();
  if (files.length > 0) {
    const filePath = path.join(baseDir, section, files[0]);
    const data = fs.readFileSync(filePath);
    const base64 = data.toString('base64');
    images.push({
      section,
      dataUri: `data:image/png;base64,${base64}`,
    });
  }
});

const output = `export const IMAGE_DATA_URIS = ${JSON.stringify(images.map(i => i.dataUri), null, 2)};\n`;
fs.writeFileSync('remotion/src/image-data.ts', output);
console.log(`Encoded ${images.length} images to base64`);
