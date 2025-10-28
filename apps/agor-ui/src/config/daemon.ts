/**
 * Daemon configuration for UI
 *
 * Reads daemon URL from environment variables or uses defaults
 */

/**
 * Get daemon URL for UI connections
 *
 * Reads from VITE_DAEMON_URL environment variable or falls back to default
 */
// Extend window interface for runtime config injection
interface WindowWithAgorConfig extends Window {
  AGOR_DAEMON_URL?: string;
}

export function getDaemonUrl(): string {
  // 1. Check runtime window global (if daemon injected config)
  if (typeof window !== 'undefined' && (window as WindowWithAgorConfig).AGOR_DAEMON_URL) {
    return (window as WindowWithAgorConfig).AGOR_DAEMON_URL;
  }

  // 2. Check build-time environment variable (set via .env.local or at build time)
  const envUrl = import.meta.env.VITE_DAEMON_URL;
  if (envUrl) {
    return envUrl;
  }

  // 3. Runtime detection: If UI is served from /ui path, it's served BY the daemon
  // So the daemon must be at the same origin (window.location.origin)
  // This handles: Codespaces, production, any case where daemon serves UI
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ui')) {
    return window.location.origin;
  }

  // 4. Fall back to default (local dev: UI dev server on 5173, daemon on 3030)
  const defaultPort = import.meta.env.VITE_DAEMON_PORT || '3030';
  const defaultHost = import.meta.env.VITE_DAEMON_HOST || 'localhost';

  return `http://${defaultHost}:${defaultPort}`;
}

/**
 * Default daemon URL (for backwards compatibility)
 */
export const DEFAULT_DAEMON_URL = getDaemonUrl();
