import fs from 'fs';
import path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const envContent = fs.readFileSync('.env.local', 'utf8').replace(/^\ufeff/, '');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/');

const SCAN_PROMPT =
  "You are a document security scanner. " +
  "Examine this screenshot of a document page carefully.\n\n" +
  "Flag the document UNSAFE if you can see ANY visible, legible text of any kind — " +
  "including words, sentences, headings, captions, labels, numbers with units, or any readable characters " +
  "that a human could read. Even a single visible word counts.\n\n" +
  "Only flag the document SAFE if the page is blank or contains no readable text whatsoever " +
  "(purely decorative images, shapes, whitespace, or entirely empty pages are SAFE).\n\n" +
  "Do not try to assess whether the text is benign, malicious, or an instruction — that is not your job. " +
  "Your only job is to detect the presence of any visible, legible text.\n\n" +
  "Reply with exactly one of:\n" +
  "SAFE\n" +
  "UNSAFE: <brief description of the text you saw>\n" +
  "Do not add any other text.";

async function renderPdf(pdfBuffer) {
  const pdf = await getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true, isEvalSupported: false }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  const img = canvas.toBuffer('image/png');
  page.cleanup();
  await pdf.destroy();
  return img;
}

async function scan(label, pdfPath) {
  process.stdout.write('Scanning ' + label + '...\n');
  const buf = fs.readFileSync(pdfPath);
  const img = await renderPdf(buf);
  const client = new BedrockRuntimeClient({ region: env.AWS_REGION || env.BEDROCK_REGION || 'us-east-1' });
  const resp = await client.send(new ConverseCommand({
    modelId: env.BEDROCK_MODEL_ARN,
    system: [{ text: "You are a security scanner. Follow the user's instructions exactly." }],
    messages: [{ role: 'user', content: [{ image: { format: 'png', source: { bytes: img } } }, { text: SCAN_PROMPT }] }],
    inferenceConfig: { maxTokens: 256, temperature: 0 }
  }));
  const text = (resp.output?.message?.content ?? []).filter(b => 'text' in b).map(b => b.text).join('').trim();
  process.stdout.write(label + ' -> safe=' + !text.startsWith('UNSAFE') + '  response="' + text + '"\n');
}

await scan('sc',        'C:/Users/evan/Desktop/sc.pdf');
await scan('sc_edited', 'C:/Users/evan/Downloads/sc_edited.pdf');
