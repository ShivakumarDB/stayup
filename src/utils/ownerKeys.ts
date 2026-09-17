const STORAGE_KEY = 'stayup_owner_keys_v1';

export function getOwnerKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOwnerKey(linkId: string, secretKey: string) {
  if (typeof window === 'undefined' || !linkId || !secretKey) return;
  try {
    const keys = getOwnerKeys();
    keys[linkId] = secretKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save owner key:', err);
  }
}

export function getOwnerKey(linkId: string): string | null {
  const keys = getOwnerKeys();
  return keys[linkId] || null;
}

export function isOwnerOf(linkId: string): boolean {
  if (!linkId) return false;
  const keys = getOwnerKeys();
  return Boolean(keys[linkId]);
}
