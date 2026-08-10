// A type alias rather than an interface: the SDK's CallToolResult carries an
// index signature, and only aliases pick up the implicit one needed to match it.
export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: true
}

/**
 * Wraps a tool payload as MCP content.
 *
 * Without `isError`, a client cannot tell "shader directory not found" from a
 * successful analysis that happened to find nothing — both arrive as plain
 * text. Whole-call failures are marked; a batch whose entries partly failed is
 * left unmarked, since the per-entry status already carries that detail.
 */
export function toolResult(payload: unknown): ToolResult {
  const failed =
    !Array.isArray(payload) &&
    typeof payload === 'object' &&
    payload !== null &&
    ((payload as { status?: unknown }).status === 'error' ||
      typeof (payload as { error?: unknown }).error === 'string')

  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    ...(failed ? { isError: true as const } : {}),
  }
}
