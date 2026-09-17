/**
 * attachments.js — PDF text extraction for the ingestion pipeline.
 *
 * Real mail exposed a gap docs/ingestion.md never anticipated: Lindisfarne's
 * admin office routinely sends the actual content as a PDF attachment with
 * a near-empty cover email ("Please find attached correspondence...") —
 * confirmed for both a safety notice from the principal and an Ad Astra
 * program info night, 17 Sep 2026. The brief's "attachments are usually
 * chrome" note (signature images, filtered out) is the opposite case: here
 * the PDF IS the substance, not decoration.
 *
 * Scope: PDFs only. Everything else (signature images, logos) is exactly
 * the chrome that note already says to filter — "filter by filename and
 * size before treating any attachment as content" extends naturally to
 * "and by type."
 *
 * Deliberately pdf-parse@1, not the current major (2.x): v2 added
 * screenshot/image-rendering features this never uses, and pulled in
 * @napi-rs/canvas — a native binary — to do it, which broke the whole route
 * module at runtime on Vercel (a 500 with no stack trace reaching the
 * route's own try/catch, confirmed 17 Sep 2026). v1 has no native
 * dependencies and does exactly the one thing needed here: text out of a
 * buffer.
 */

import pdf from 'pdf-parse';

const MAX_PDF_BYTES = 15 * 1024 * 1024; // generous for a school letter; a guard against something pathological
const MAX_EXTRACTED_CHARS = 15000;      // same sizing spirit as clean.js — cleaning isn't optional at volume

/**
 * @param {object[]} attachments  mailparser's parsed.attachments
 * @returns {string} extracted text from every PDF attachment, each
 *   clearly delimited by filename, or '' if none/none parseable. Never
 *   throws — a corrupted or encrypted PDF degrades to no text for that one
 *   attachment, not a failed extraction for the whole email.
 */
export async function extractPdfText(attachments = []) {
  const sections = [];

  for (const att of attachments) {
    const isPdf = att.contentType === 'application/pdf' || /\.pdf$/i.test(att.filename ?? '');
    if (!isPdf) continue;
    if (!att.content || att.content.length > MAX_PDF_BYTES) continue;

    try {
      const result = await pdf(att.content);
      const text = (result.text ?? '').trim();
      if (text) {
        sections.push(
          `--- Attachment: ${att.filename ?? 'document.pdf'} ---\n${text.slice(0, MAX_EXTRACTED_CHARS)}`
        );
      }
    } catch (e) {
      console.error(`[ingest] PDF text extraction failed for "${att.filename}":`, e.message);
    }
  }

  return sections.join('\n\n');
}
