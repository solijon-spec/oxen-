/**
 * OXEN — localStorage Migration
 *
 * Migrates old `safario.*` keys to the new `oxen.*` namespace so existing
 * users keep their theme, language, wishlist, travel history, etc. after the
 * project rebrand. Runs once on app boot, is idempotent, and silently no-ops
 * if no old keys exist or migration already happened.
 */

const MIGRATED_FLAG = "oxen.storage-migrated";

const PREFIX_OLD = "safario.";
const PREFIX_NEW = "oxen.";

/**
 * Copy every `safario.*` localStorage key to its `oxen.*` equivalent, but
 * never overwrite an existing `oxen.*` key (the new value wins). Old keys are
 * left in place so a rollback would still find them; they can be cleared
 * manually. Safe to call multiple times.
 */
export function migrateStorage(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG)) return;

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX_OLD)) keys.push(key);
    }

    for (const oldKey of keys) {
      const newKey = PREFIX_NEW + oldKey.slice(PREFIX_OLD.length);
      if (localStorage.getItem(newKey) === null) {
        const value = localStorage.getItem(oldKey);
        if (value !== null) localStorage.setItem(newKey, value);
      }
    }

    localStorage.setItem(MIGRATED_FLAG, "1");
  } catch {
    // Storage unavailable or quota — non-fatal, app still works.
  }
}
