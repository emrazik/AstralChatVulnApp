# Research scratchpad

Throwaway experiments from building the PDF-scanner challenge. They aren't part of the app and they call Bedrock directly using values from `.env.local`.

| File | What it tested |
|---|---|
| `scan_test.mjs`, `scan_test2.mjs` | Render PDF pages with pdf.js + `@napi-rs/canvas` and ask a vision model whether any text is visible |
| `render_test.mjs` | Compare what pdf.js *renders* with what `pdf-parse` *extracts* |
| `pivot_test.mjs` | How strongly Celeste follows instructions arriving inside `<uploaded_pdf>` |
| `*_render.png` | Rendered pages used while tuning the scanner prompt |

Run them from the repo root (e.g. `node research/scan_test.mjs`) after `npm install`.
