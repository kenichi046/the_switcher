// Shared storage helper for The Switcher.
// Supports optional cross-device sync via chrome.storage.sync, plus an
// automatic local backup of the previous config on every save.
//
// Data model (unchanged):
//   theswitcher = [ {name, url:[...]}, ..., {sametab:bool} ]
//
// Keys:
//   theswitcher        - the active config (local, or sync when enabled)
//   theswitcher_sync   - sync-enabled flag (stored in sync so other devices know)
//   theswitcher_backup - { data, savedAt } snapshot of the previous non-empty config (local)
(function (global) {
  const DATA_KEY = 'theswitcher';
  const SYNC_FLAG = 'theswitcher_sync';
  const BACKUP_KEY = 'theswitcher_backup';

  // A config "has projects" if it contains at least one project object (with a url array).
  function hasProjects(data) {
    return Array.isArray(data) && data.some(function (it) {
      return it && Array.isArray(it.url);
    });
  }

  // Load config, preferring synced data when sync is enabled.
  // Returns { data, syncEnabled }.
  async function load() {
    let syncEnabled = false;
    try {
      const s = await chrome.storage.sync.get([DATA_KEY, SYNC_FLAG]);
      if (s && s[SYNC_FLAG]) {
        syncEnabled = true;
        if (s[DATA_KEY] !== undefined) {
          return { data: s[DATA_KEY], syncEnabled: true };
        }
      }
    } catch (e) {
      // sync unavailable (e.g. signed out) -> fall back to local
    }
    const l = await chrome.storage.local.get(DATA_KEY);
    return { data: l[DATA_KEY], syncEnabled: syncEnabled };
  }

  // Snapshot the currently-saved config to a local backup BEFORE overwriting it,
  // but only when it actually contains projects. This guarantees an accidental
  // empty/overwrite save can never clobber a good backup.
  async function snapshotBackup() {
    try {
      const prev = await load();
      if (hasProjects(prev.data)) {
        await chrome.storage.local.set({
          [BACKUP_KEY]: { data: prev.data, savedAt: Date.now() }
        });
      }
    } catch (e) {
      // backup is best-effort; never block a save
    }
  }

  // Persist config to the active area. Throws on failure (e.g. sync quota).
  async function save(data, syncEnabled) {
    await snapshotBackup();
    if (syncEnabled) {
      // may reject with QUOTA_BYTES_PER_ITEM (8KB) on very large configs
      await chrome.storage.sync.set({ [DATA_KEY]: data, [SYNC_FLAG]: true });
      // keep a local copy as an offline fallback
      await chrome.storage.local.set({ [DATA_KEY]: data });
    } else {
      await chrome.storage.local.set({ [DATA_KEY]: data });
      try {
        await chrome.storage.sync.set({ [SYNC_FLAG]: false });
        await chrome.storage.sync.remove(DATA_KEY);
      } catch (e) {
        // ignore: turning sync off should never block a local save
      }
    }
  }

  // Returns { data, savedAt } or null.
  async function loadBackup() {
    const r = await chrome.storage.local.get(BACKUP_KEY);
    return r[BACKUP_KEY] || null;
  }

  global.TheSwitcherStore = {
    DATA_KEY, SYNC_FLAG, BACKUP_KEY,
    load, save, loadBackup, hasProjects
  };
})(self);
