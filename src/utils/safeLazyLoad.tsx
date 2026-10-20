import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, X, Trash2, CheckCircle2 } from 'lucide-react';

/**
 * Global cache of resolved or active module import promises.
 * Failed imports are immediately purged to prevent caching failed rejections,
 * avoiding permanent module lockouts.
 */
const modulePromiseCache = new Map<string, Promise<{ default: React.ComponentType<any> }>>();

/**
 * Clears failed or cached module promises.
 * @param name Optional module identifier to clear specifically. If omitted, clears all.
 */
export function clearLazyModuleCache(name?: string): void {
  if (name) {
    modulePromiseCache.delete(name);
  } else {
    modulePromiseCache.clear();
  }
}

export interface SafeLazyOptions {
  /** Descriptive identifier used for caching, error messages, and manual retries */
  name?: string;
  /** Maximum time allowed for dynamic import before rejecting (default: 12000ms) */
  timeoutMs?: number;
}

/**
 * Safe dynamic import loader with timeout protection and cache invalidation.
 * Prevents UI freezes when network chunks hang, drop, or fail.
 */
export function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
  options: SafeLazyOptions = {}
): React.LazyExoticComponent<T> {
  const { name = 'module', timeoutMs = 12000 } = options;

  return React.lazy(() => {
    // Return cached promise if already active or resolved
    if (name && modulePromiseCache.has(name)) {
      return modulePromiseCache.get(name)! as Promise<{ default: T }>;
    }

    const loadPromise = new Promise<{ default: T }>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (name) modulePromiseCache.delete(name);
          reject(new Error(`Loading ${name} timed out after ${timeoutMs}ms. Please check your connection.`));
        }
      }, timeoutMs);

      factory()
        .then((module) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const comp =
            module && typeof module === 'object' && 'default' in module && module.default
              ? (module as { default: T })
              : { default: module as unknown as T };
          resolve(comp);
        })
        .catch((err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (name) modulePromiseCache.delete(name);
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    if (name) {
      modulePromiseCache.set(name, loadPromise);
    }

    return loadPromise;
  });
}

/**
 * Safely dynamic import a module or command with timeout protection to prevent UI freezes.
 */
export async function safeImport<T>(
  importFn: () => Promise<T>,
  options: { name?: string; timeoutMs?: number } = {}
): Promise<T> {
  const { name = 'module', timeoutMs = 10000 } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Loading ${name} timed out after ${timeoutMs}ms. Please check your connection.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([importFn(), timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (err) {
    if (timer) clearTimeout(timer);
    throw err;
  }
}

/**
 * Explicit lifecycle status for lazy modules.
 */
export type LazyModuleStatus = 'loading' | 'success' | 'failed';

export interface LazyModuleBoundaryProps {
  children: ReactNode;
  moduleName?: string;
  onClose?: () => void;
  variant?: 'sidebar' | 'modal' | 'inline' | 'fullscreen';
  fallbackTitle?: string;
  /** Optional callback fired when status transitions */
  onStatusChange?: (status: LazyModuleStatus, error: Error | null) => void;
}

export interface LazyModuleBoundaryState {
  /** Explicit module status tracking loading, success, and failed states separately */
  status: LazyModuleStatus;
  /** Current caught error instance */
  error: Error | null;
  /** Persistent error message that stays retained across retries until explicitly cleared */
  lastErrorMessage: string | null;
  /** Unique key bumped on retry to force re-mounting of the children */
  retryKey: number;
  /** Total retry attempts initiated by the user */
  retryCount: number;
  /** Number of times loading has failed */
  failedAttempts: number;
}

/**
 * Internal helper component to signal successful mount of the lazy component
 */
const LazySuccessWatcher: React.FC<{ onMount: () => void }> = ({ onMount }) => {
  React.useEffect(() => {
    onMount();
  }, [onMount]);
  return null;
};

/**
 * ErrorBoundary specifically engineered for lazy-loaded tools, sidebars, and modals.
 * Features a robust 3-state management system ('loading', 'success', 'failed'):
 * - Tracks 'loading', 'success', and 'failed' states separately.
 * - Ensures that if a retry fails, the error message persists so the user can inspect it and clear the state manually.
 * - Provides explicit 'Retry Loading', 'Clear Error State', and 'Dismiss & Continue Editing' actions.
 * - Guarantees the editor and document state never freeze.
 */
export class LazyModuleBoundary extends Component<
  LazyModuleBoundaryProps,
  LazyModuleBoundaryState
> {
  constructor(props: LazyModuleBoundaryProps) {
    super(props);
    this.state = {
      status: 'loading',
      error: null,
      lastErrorMessage: null,
      retryKey: 0,
      retryCount: 0,
      failedAttempts: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<LazyModuleBoundaryState> {
    const rawMessage = error?.message || 'The module could not be loaded.';
    const cleanMessage = rawMessage.replace(/^Error:\s*/, '');
    return {
      status: 'failed',
      error,
      lastErrorMessage: cleanMessage,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[LazyModuleBoundary] Error in module "${this.props.moduleName || 'unnamed'}":`,
      error,
      errorInfo
    );

    if (this.props.moduleName) {
      clearLazyModuleCache(this.props.moduleName);
    }

    const cleanMessage = (error?.message || 'Failed to load module.').replace(/^Error:\s*/, '');

    this.setState((prev) => {
      const nextFailedAttempts = prev.failedAttempts + 1;
      // Persist the specific error message; if a retry fails, preserve the context
      const persistentMessage =
        prev.retryCount > 0
          ? `Retry attempt #${prev.retryCount} failed: ${cleanMessage}`
          : cleanMessage;

      if (this.props.onStatusChange) {
        this.props.onStatusChange('failed', error);
      }

      return {
        status: 'failed',
        error,
        lastErrorMessage: persistentMessage,
        failedAttempts: nextFailedAttempts,
      };
    });
  }

  /**
   * Invoked when the lazy child component resolves and mounts successfully.
   */
  handleSuccess = (): void => {
    if (this.state.status !== 'success') {
      this.setState({
        status: 'success',
        error: null,
        lastErrorMessage: null,
      });

      if (this.props.onStatusChange) {
        this.props.onStatusChange('success', null);
      }
    }
  };

  /**
   * Manual retry handler: transitions to 'loading' to attempt re-import,
   * purges module cache, increments retryCount, and updates retryKey.
   * If re-import fails, the error message persists with attempt information.
   */
  handleRetry = (): void => {
    if (this.props.moduleName) {
      clearLazyModuleCache(this.props.moduleName);
    }

    this.setState((prev) => {
      if (this.props.onStatusChange) {
        this.props.onStatusChange('loading', null);
      }
      return {
        status: 'loading',
        error: null,
        // Keep lastErrorMessage so user still has context if retry takes time or fails
        retryKey: prev.retryKey + 1,
        retryCount: prev.retryCount + 1,
      };
    });
  };

  /**
   * Manual state clear handler: explicitly resets the error state,
   * clears persistent error message and cache, returning to initial state or dismissing.
   */
  handleClearState = (): void => {
    if (this.props.moduleName) {
      clearLazyModuleCache(this.props.moduleName);
    }

    this.setState({
      status: 'loading',
      error: null,
      lastErrorMessage: null,
      failedAttempts: 0,
      retryCount: 0,
      retryKey: this.state.retryKey + 1,
    });

    if (this.props.onStatusChange) {
      this.props.onStatusChange('loading', null);
    }

    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render(): ReactNode {
    const { status, error, lastErrorMessage, failedAttempts, retryCount } = this.state;
    const {
      moduleName = 'Feature module',
      onClose,
      variant = 'sidebar',
      fallbackTitle = 'Component Load Error',
    } = this.props;

    // FAILED STATE UI
    if (status === 'failed') {
      const displayMessage =
        lastErrorMessage ||
        error?.message?.replace(/^Error:\s*/, '') ||
        'The module could not be loaded due to a network interruption or timeout.';

      if (variant === 'sidebar') {
        return (
          <aside
            className="w-80 shrink-0 border-l border-amber-300 dark:border-amber-900/60 bg-amber-50/95 dark:bg-neutral-900 flex flex-col h-full shadow-lg z-30 p-4 text-slate-800 dark:text-neutral-200 select-none animate-fade-in"
            aria-label={`${moduleName} Load Error`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                <AlertTriangle size={16} />
                <span>{fallbackTitle}</span>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  title="Close sidebar"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Error Content */}
            <div className="flex-1 flex flex-col justify-center items-center text-center px-2 space-y-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <AlertTriangle size={22} />
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-neutral-100 mb-1">
                  {moduleName} Unavailable
                </h4>
                {failedAttempts > 1 && (
                  <span className="inline-block px-2 py-0.5 mb-1.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    Failed {failedAttempts} attempts
                  </span>
                )}
                <div className="p-2.5 rounded-lg border border-amber-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-800/80 text-[11px] text-slate-700 dark:text-neutral-300 leading-relaxed text-left max-w-xs break-words font-mono">
                  {displayMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col w-full space-y-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <RotateCw size={13} />
                  <span>Retry Loading {retryCount > 0 ? `(#${retryCount + 1})` : ''}</span>
                </button>

                <button
                  onClick={this.handleClearState}
                  className="w-full py-1.5 px-3 rounded-lg border border-amber-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-amber-100/50 dark:hover:bg-neutral-700 text-amber-900 dark:text-neutral-200 font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  title="Clear error message, reset status, and close"
                >
                  <Trash2 size={12} />
                  <span>Clear Error State</span>
                </button>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium text-xs cursor-pointer transition-colors"
                  >
                    Dismiss &amp; Continue Editing
                  </button>
                )}
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 dark:text-neutral-500 pt-2 border-t border-amber-200/50 dark:border-neutral-800">
              State: <span className="font-semibold text-rose-600 dark:text-rose-400">Failed</span> • Editor data is safe
            </div>
          </aside>
        );
      }

      if (variant === 'modal' || variant === 'fullscreen') {
        return (
          <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-neutral-700 shadow-2xl space-y-3.5">
              <div className="flex items-center space-x-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-sm text-slate-900 dark:text-neutral-100">
                  {fallbackTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-mono p-2 rounded bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px]">
                {displayMessage}
              </p>
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={this.handleClearState}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 text-xs hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center space-x-1 cursor-pointer"
                  title="Clear error state"
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>

                <div className="flex items-center space-x-2">
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={this.handleRetry}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCw size={13} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Inline fallback
      return (
        <div className="p-3 my-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-neutral-800 dark:border-amber-800 text-xs flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 truncate">
            <AlertTriangle size={15} className="shrink-0" />
            <span className="truncate">{displayMessage}</span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={this.handleClearState}
              className="px-2 py-1 rounded border border-amber-300 dark:border-neutral-700 text-[11px] hover:bg-amber-100 dark:hover:bg-neutral-700 cursor-pointer"
              title="Clear error"
            >
              Clear
            </button>
            <button
              onClick={this.handleRetry}
              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
            >
              <RotateCw size={11} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      );
    }

    // LOADING OR SUCCESS STATE
    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
        <LazySuccessWatcher onMount={this.handleSuccess} />
      </React.Fragment>
    );
  }
}

export default LazyModuleBoundary;
