/**
 * Shared path resolution utility for transform nodes.
 *
 * Resolves a dot-notation path string against an arbitrary object.
 * This mirrors the same logic as `ExecutionContext.resolveNestedPath`,
 * but operates on any object rather than the workflow variable store.
 *
 * Supported syntax:
 * - Dot notation: "contact.email"
 * - Keyed array access: "contacts[0].name"
 * - Standalone array index: "[0].name" (when current value is an array)
 * - Empty path returns the object itself
 *
 * @example
 * resolvePath({ a: { b: [1, 2] } }, 'a.b[1]') // → 2
 * resolvePath([{ id: 1 }, { id: 2 }], '[0].id') // → 1
 * resolvePath({ score: 42 }, '')                 // → { score: 42 }
 */
export function resolvePath(obj: unknown, path: string): unknown {
  // Empty path means use the value itself
  if (!path) {
    return obj;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle keyed array access like "contacts[0]"
    const keyedArrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (keyedArrayMatch) {
      const [, key, index] = keyedArrayMatch;
      current = (current as Record<string, unknown>)[key!];
      if (Array.isArray(current)) {
        current = current[parseInt(index!, 10)];
      } else {
        return undefined;
      }
      continue;
    }

    // Handle standalone array index like "[0]"
    const standaloneIndexMatch = part.match(/^\[(\d+)\]$/);
    if (standaloneIndexMatch) {
      if (Array.isArray(current)) {
        current = current[parseInt(standaloneIndexMatch[1]!, 10)];
      } else {
        return undefined;
      }
      continue;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
