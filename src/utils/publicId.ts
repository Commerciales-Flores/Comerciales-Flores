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