const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');

const A4_WIDTH = 595.28;
const A4_HEIGHT = 842.89;
const TARGET_DPI = 150;
const TARGET_PX_W = Math.round(A4_WIDTH * TARGET_DPI / 72);
const TARGET_PX_H = Math.round(A4_HEIGHT * TARGET_DPI / 72);

async function convertImagesToPdf(imagePaths, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    let normalized = await sharp(imgPath)
      .rotate()
      .resize(TARGET_PX_W, TARGET_PX_H, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    const ext = path.extname(imgPath).toLowerCase();
    let image;
    if (ext === '.png') {
      image = await pdfDoc.embedPng(normalized);
    } else {
      image = await pdfDoc.embedJpg(normalized);
    }

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const { width, height } = image.scaleToFit(A4_WIDTH - 40, A4_HEIGHT - 40);
    page.drawImage(image, {
      x: (A4_WIDTH - width) / 2,
      y: (A4_HEIGHT - height) / 2,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { convertImagesToPdf, A4_WIDTH, A4_HEIGHT };
