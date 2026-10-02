/**
 * snapshotStore.ts
 * Reliable In-Memory and Multi-Tier Storage Cache for Document Screen Snapshots.
 * Solves LocalStorage 5MB quota exceeded limits and guarantees immediate delivery
 * to lazy-loaded components like ImageWizardSidebar.
 */

export interface SnapshotMetadata {
  id: string;
  timestamp: number;
  dataUrl: string;
  source: 'screen_capture' | 'milestone' | 'snip';
  width?: number;
  height?: number;
}

class SnapshotStore {
  private inMemorySnapshot: string | null = null;
  private pendingForWizard: string | null = null;
  private listeners: Set<(dataUrl: string) => void> = new Set();
  private isWizardMounted: boolean = false;

  constructor() {
    // Listen for Wizard Ready event if Image Wizard mounts
    if (typeof window !== 'undefined') {
      window.addEventListener('word_image_wizard_ready', () => {
        this.isWizardMounted = true;
        if (this.pendingForWizard) {
          const pending = this.pendingForWizard;
          this.pendingForWizard = null;
          this.notifyListeners(pending);
          window.dispatchEvent(
            new CustomEvent('word_image_wizard_load', { detail: { src: pending } })
          );
        }
      });
    }
  }

  /**
   * Save a snapshot into in-memory store and safe local/session storage cache
   */
  public setLatestSnapshot(dataUrl: string, source: 'screen_capture' | 'milestone' | 'snip' = 'screen_capture'): void {
    if (!dataUrl) return;

    this.inMemorySnapshot = dataUrl;
    this.pendingForWizard = dataUrl;

    // 1. Safe SessionStorage (survives page navigations without quota crash)
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('word_doc_cached_snapshot', dataUrl);
      }
    } catch (e) {
      console.warn('SessionStorage quota warning for snapshot', e);
    }

    // 2. Safe LocalStorage (catch QuotaExceededError without crashing)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('word_doc_cached_snapshot', dataUrl);
      }
    } catch (e) {
      console.warn('LocalStorage quota limit exceeded for snapshot; in-memory cache preserved.', e);
    }

    // 3. Notify all currently registered listeners
    this.notifyListeners(dataUrl);

    // 4. Broadcast CustomEvent immediately and with delayed retries
    // to guarantee delivery if ImageWizard is currently lazy-loading!
    this.broadcastWithRetries(dataUrl);
  }

  /**
   * Retrieve latest snapshot from in-memory cache, sessionStorage, or localStorage
   */
  public getLatestSnapshot(): string | null {
    if (this.inMemorySnapshot) {
      return this.inMemorySnapshot;
    }

    try {
      if (typeof sessionStorage !== 'undefined') {
        const sessionCached = sessionStorage.getItem('word_doc_cached_snapshot');
        if (sessionCached && sessionCached.length > 50) {
          this.inMemorySnapshot = sessionCached;
          return sessionCached;
        }
      }
    } catch {}

    try {
      if (typeof localStorage !== 'undefined') {
        const localCached = localStorage.getItem('word_doc_cached_snapshot');
        if (localCached && localCached.length > 50) {
          this.inMemorySnapshot = localCached;
          return localCached;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Consume any pending snapshot waiting for Image Wizard mount
   */
  public consumePendingForWizard(): string | null {
    const pending = this.pendingForWizard || this.inMemorySnapshot || this.getLatestSnapshot();
    this.pendingForWizard = null;
    return pending;
  }

  /**
   * Subscribe to new snapshots
   */
  public subscribe(listener: (dataUrl: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Mark that Image Wizard is mounted and notify listeners
   */
  public markWizardReady(): void {
    this.isWizardMounted = true;
    if (this.pendingForWizard) {
      const pending = this.pendingForWizard;
      this.pendingForWizard = null;
      this.notifyListeners(pending);
    }
  }

  private notifyListeners(dataUrl: string): void {
    this.listeners.forEach((listener) => {
      try {
        listener(dataUrl);
      } catch (err) {
        console.error('Error in snapshot listener:', err);
      }
    });
  }

  /**
   * Broadcast CustomEvent repeatedly across the lazy-load mounting window
   */
  private broadcastWithRetries(dataUrl: string): void {
    if (typeof window === 'undefined') return;

    const dispatch = () => {
      window.dispatchEvent(
        new CustomEvent('word_image_wizard_load', { detail: { src: dataUrl } })
      );
    };

    // Immediate
    dispatch();

    // Retries across the lazy-loading lifecycle (100ms, 250ms, 500ms, 900ms)
    setTimeout(dispatch, 100);
    setTimeout(dispatch, 250);
    setTimeout(dispatch, 500);
    setTimeout(dispatch, 900);
  }
}

export const snapshotStore = new SnapshotStore();
