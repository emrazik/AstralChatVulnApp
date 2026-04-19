import fs from 'fs';
import path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/');

async function renderAndCheck(label, pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const pdf = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  const img = canvas.toBuffer('image/png');
  fs.writeFileSync(label + '_render.png', img);
  console.log(label + ': rendered ' + img.length + ' bytes -> ' + label + '_render.png');
  page.cleanup();
  await pdf.destroy();
}

await renderAndCheck('sc',        'C:/Users/evan/Desktop/sc.pdf');
await renderAndCheck('sc_edited', 'C:/Users/evan/Downloads/sc_edited.pdf');
