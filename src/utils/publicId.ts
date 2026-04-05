/**
 * ⚠️ IMPORTANT: DO NOT USE FOR PERSISTED DATA
 *
 * This function mirrors the database `generate_public_id` logic.
 *
 * The database (via triggers) is the SINGLE SOURCE OF TRUTH for public_id.
 * Frontend should NEVER generate official IDs for stored records.
 *
 * This function exists ONLY for:
 * - mock data
 * - temporary UI placeholders
 * - non-persistent previews
 *
 * If you use this for real data, you risk:
 * - mismatched IDs
 * - audit inconsistencies
 * - broken references
 *
 * If backend logic changes (length, format, prefix),
 * this function MUST be updated to match.
 */
export function makePublicId(
  prefix: string,
  options: { uuid?: string; sequence?: number; length?: number } = {}
) {
  const { uuid, sequence, length = 6 } = options;

  if (sequence !== undefined) {
    return `${prefix}-${String(sequence).padStart(length, '0')}`;
  }

  if (uuid) {
    const clean = uuid.replace(/-/g, '').toUpperCase();
    return `${prefix}-${clean.slice(-length)}`;
  }

  throw new Error("makePublicId requires either uuid or sequence");
}