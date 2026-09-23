/* ==========================================================================
   Family Hub — files
   The shared attachment layer §7.7 of the design brief describes: quotes,
   invoices, receipts, warranties, manuals. One document belongs to exactly
   one owner — an asset or a job, never both, never neither.

   Stored as `bytea` in the same Postgres database rather than a separate
   blob store — a household's receipt volume is trivially small, and this
   needs no new account or token to provision. If that ever stops being
   true, the fix is a contained swap behind this file, not a rewrite of
   anything that calls it.

   The neon serverless driver mimics `pg` and uses the same `pg-types`
   parsing, so a `bytea` column round-trips as a Node `Buffer` in both
   directions — passed in as one on insert, read back as one on select.

   Reads degrade the same way every other module here does: no database
   means an empty list, never a thrown error. Uploads and downloads are the
   one place that can't degrade quietly — those surface a real error, since
   a silently-lost receipt is worse than a visible failure.
   ========================================================================== */

import { sql, hasDb } from './db.js';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — see the route for what happens past this

function shapeMeta(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    jobId: row.job_id,
    label: row.label,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

/** Metadata only, never the blob itself — for list views. Exactly one of
    `assetId`/`jobId` is expected; the other stays undefined. */
export async function listDocuments({ assetId, jobId }) {
  if (!hasDb) return [];
  try {
    const rows = assetId != null
      ? await sql`
          select id, asset_id, job_id, label, filename, content_type, size_bytes, uploaded_by, uploaded_at
          from document where asset_id = ${assetId} order by uploaded_at desc`
      : await sql`
          select id, asset_id, job_id, label, filename, content_type, size_bytes, uploaded_by, uploaded_at
          from document where job_id = ${jobId} order by uploaded_at desc`;
    return rows.map(shapeMeta);
  } catch (e) {
    console.error('listDocuments failed:', e.message);
    return [];
  }
}

/** The full row, blob included — for serving a download. Null on any
    failure, including "not found," so the route can 404 either way. */
export async function getDocument(id) {
  if (!hasDb) return null;
  try {
    const rows = await sql`
      select id, filename, content_type, data from document where id = ${id}`;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, filename: row.filename, contentType: row.content_type, data: row.data };
  } catch (e) {
    console.error('getDocument failed:', e.message);
    return null;
  }
}

export async function addDocument({ assetId, jobId, label, filename, contentType, buffer, uploadedBy }) {
  if (!hasDb) throw new Error('no database configured');
  const rows = await sql`
    insert into document (asset_id, job_id, label, filename, content_type, size_bytes, data, uploaded_by)
    values (${assetId ?? null}, ${jobId ?? null}, ${label}, ${filename}, ${contentType}, ${buffer.length}, ${buffer}, ${uploadedBy ?? null})
    returning id`;
  return rows[0].id;
}

export async function deleteDocument(id) {
  if (!hasDb) return;
  try {
    await sql`delete from document where id = ${id}`;
  } catch (e) {
    console.error('deleteDocument failed:', e.message);
    throw e;
  }
}
