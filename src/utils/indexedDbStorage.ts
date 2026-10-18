/**
 * indexedDbStorage.ts
 * High-performance, asynchronous IndexedDB storage layer with seamless LocalStorage fallback.
 * Solves the synchronous UI-blocking latency and the 5MB quota limit for 8h-12h daily workloads.
 */

import { DocumentSnapshot } from '../types';

const DB_NAME = 'WordPad_Storage_DB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_SNAPSHOTS = 'snapshots';

const STORAGE_KEY_CONTENT = 'wordpad_document_content';
const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';
const STORAGE_KEY_SNAPSHOTS = 'word_doc_snapshots';

let dbInstance: IDBDatabase | null = null;
let isIndexedDbSupported: boolean | null = null;

/**
 * Check whether IndexedDB is available and functioning in the current browser environment.
 */
export function checkIndexedDbSupport(): boolean {
  if (isIndexedDbSupported !== null) return isIndexedDbSupported;
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      isIndexedDbSupported = false;
      return false;
    }
    isIndexedDbSupported = true;
    return true;
  } catch {
    isIndexedDbSupported = false;
    return false;
  }
}

/**
 * Open or retrieve the existing IndexedDB connection with schema initialization.
 */
export function getDbConnection(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    if (!checkIndexedDbSupport()) {
      return reject(new Error('IndexedDB is not supported on this device/environment'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          db.createObjectStore(STORE_DOCUMENTS);
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        const err = (event.target as IDBOpenDBRequest).error;
        console.warn('IndexedDB open error, will fallback to localStorage:', err);
        isIndexedDbSupported = false;
        reject(err || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB open blocked by other tabs.');
      };
    } catch (e) {
      isIndexedDbSupported = false;
      reject(e);
    }
  });
}

/**
 * Save Document Content asynchronously.
 * Saves to IndexedDB without blocking the UI thread, with transparent fallback.
 */
export async function asyncSaveDocumentContent(html: string): Promise<boolean> {
  if (!html) return true;

  try {
    const db = await getDbConnection();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.put(html, 'current_content');

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('IndexedDB put content error, trying fallback');
        fallbackSaveToLocalStorage(STORAGE_KEY_CONTENT, html);
        resolve(true);
      };
    });
  } catch {
    // Graceful fallback to localStorage
    return fallbackSaveToLocalStorage(STORAGE_KEY_CONTENT, html);
  }
}

/**
 * Load Document Content asynchronously from IndexedDB or LocalStorage.
 */
export async function asyncLoadDocumentContent(): Promise<string | null> {
  try {
    const db = await getDbConnection();
    const content = await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.get('current_content');

      req.onsuccess = () => {
        if (req.result && typeof req.result === 'string') {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });

    if (content) return content;
  } catch {
    // Ignore and fallback to localStorage
  }

  // Fallback to localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CONTENT);
      if (saved && saved.trim()) return saved;
    }
  } catch {}

  return null;
}

/**
 * Save Document Settings asynchronously.
 */
export async function asyncSaveDocumentSettings(settings: any): Promise<boolean> {
  if (!settings) return true;

  try {
    const db = await getDbConnection();
    await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.put(settings, 'current_settings');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {}

  // Also mirror settings to localStorage because settings is tiny (< 2KB)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  } catch {}

  return true;
}

/**
 * Load Document Settings asynchronously.
 */
export async function asyncLoadDocumentSettings(): Promise<any | null> {
  try {
    const db = await getDbConnection();
    const settings = await new Promise<any | null>((resolve) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.get('current_settings');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (settings) return settings;
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    }
  } catch {}

  return null;
}

/**
 * Save a Version History Snapshot into IndexedDB.
 */
export async function asyncSaveSnapshot(snapshot: DocumentSnapshot, maxLimit: number = 6): Promise<boolean> {
  if (!snapshot || !snapshot.id) return false;

  try {
    const db = await getDbConnection();
    await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });

    // Auto-prune older snapshots if exceeding maxLimit (6)
    const all = await asyncGetAllSnapshots();
    if (all.length > maxLimit) {
      const excess = all.slice(maxLimit);
      for (const old of excess) {
        await asyncDeleteSnapshot(old.id);
      }
    }
    return true;
  } catch {
    // Fallback to localStorage list
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
        const existing: DocumentSnapshot[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((s) => s.id !== snapshot.id);
        const updated = [snapshot, ...filtered].slice(0, maxLimit);
        localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
        return true;
      }
    } catch {}
    return false;
  }
}

/**
 * Load all Snapshots from IndexedDB or LocalStorage.
 */
export async function asyncGetAllSnapshots(): Promise<DocumentSnapshot[]> {
  try {
    const db = await getDbConnection();
    const idbSnapshots = await new Promise<DocumentSnapshot[]>((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as DocumentSnapshot[];
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });

    if (idbSnapshots && idbSnapshots.length > 0) {
      // Sort newest first
      return idbSnapshots.sort((a, b) => (b.id > a.id ? 1 : -1));
    }
  } catch {}

  // Fallback to localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (saved) {
        const list = JSON.parse(saved) as DocumentSnapshot[];
        return list;
      }
    }
  } catch {}

  return [];
}

/**
 * Delete a Snapshot by ID from IndexedDB and LocalStorage.
 */
export async function asyncDeleteSnapshot(id: string): Promise<boolean> {
  try {
    const db = await getDbConnection();
    await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (saved) {
        const list = (JSON.parse(saved) as DocumentSnapshot[]).filter((s) => s.id !== id);
        localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(list));
      }
    }
  } catch {}

  return true;
}

/**
 * Emergency Cache Cleaner.
 * Instantly purges heavy caches, old snapshots, and orphaned temporary data
 * to guarantee storage availability and unblock the user immediately.
 */
export async function clearStorageCache(): Promise<{ success: boolean; message: string }> {
  let freedItems = 0;

  // 1. Clear LocalStorage non-essential keys
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToClear = [
        'word_doc_cached_snapshot',
        'wordpad_screen_snapshot_temp',
        'word_image_wizard_temp',
        'word_doc_snapshots',
      ];
      keysToClear.forEach((k) => {
        if (localStorage.getItem(k) !== null) {
          localStorage.removeItem(k);
          freedItems++;
        }
      });
    }
  } catch (e) {
    console.warn('LocalStorage cache clear error:', e);
  }

  // 2. Clear SessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      freedItems++;
    }
  } catch {}

  // 3. Prune old snapshots in IndexedDB (retain only 3 most recent)
  try {
    const db = await getDbConnection();
    const snapshots = await asyncGetAllSnapshots();
    if (snapshots.length > 3) {
      const toRemove = snapshots.slice(3);
      for (const s of toRemove) {
        await asyncDeleteSnapshot(s.id);
        freedItems++;
      }
    }
  } catch {}

  return {
    success: true,
    message: `Cache cleared successfully (${freedItems} temporary items removed). Storage ready!`,
  };
}

/**
 * Fallback helper for writing to localStorage safely.
 */
function fallbackSaveToLocalStorage(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (err: any) {
    console.warn('LocalStorage quota limit reached:', err);
    throw err; // Re-throw to allow catch & error notification
  }
  return false;
}
