/**
 * User-scoped localStorage wrapper.
 * All keys are prefixed with the current user's ID so different accounts
 * don't share data in the same browser.
 */

const USER_ID_KEY = "bluprint_current_user_id";

export function setCurrentUserId(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, userId);
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

function scopedKey(key: string): string {
  const userId = getCurrentUserId();
  if (!userId) return key; // fallback to unscoped if no user set yet
  return `${userId}_${key}`;
}

export const userStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(scopedKey(key));
  },

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(scopedKey(key), value);
  },

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(scopedKey(key));
  },
};
