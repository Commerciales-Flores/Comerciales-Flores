export function getChangedFields<T extends Record<string, any>>(
  before: T,
  after: Partial<T>
): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(after)) {
    const typedKey = key as keyof T;

    const beforeValue = before[typedKey];
    const afterValue = after[typedKey];

    if (afterValue === undefined) continue;

    const beforeSerialized = JSON.stringify(beforeValue);
    const afterSerialized = JSON.stringify(afterValue);

    if (beforeSerialized !== afterSerialized) {
      changed.push(key);
    }
  }

  return changed;
}

export function buildAuditSnapshot<T extends Record<string, any>>(
  original: T,
  updates: Partial<T>
): T {
  return {
    ...original,
    ...updates,
  };
}