export function generateId(prefix?: string): string {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

export function nowISO(): string {
  return new Date().toISOString();
}
