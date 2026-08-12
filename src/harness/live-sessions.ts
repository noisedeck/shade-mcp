/**
 * Registry of sessions holding a browser right now.
 *
 * An MCP client kills the server with a signal, which by default leaves the
 * Chromium it spawned running and the viewer port bound. Tracking live sessions
 * gives the shutdown path something to close.
 */
export interface Closeable {
  teardown(): Promise<void>
}

const live = new Set<Closeable>()

export function trackSession(session: Closeable): void {
  live.add(session)
}

export function untrackSession(session: Closeable): void {
  live.delete(session)
}

export function liveSessionCount(): number {
  return live.size
}

/** Tears down every live session. One failure must not strand the others. */
export async function closeAllSessions(): Promise<void> {
  const sessions = [...live]
  live.clear()
  await Promise.all(sessions.map(session => session.teardown().catch(() => {})))
}
