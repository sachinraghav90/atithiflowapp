/**
 * Generates a unique ID. 
 * Uses crypto.randomUUID() if available (secure contexts), 
 * otherwise falls back to a Math.random() based string.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for non-secure contexts (http://IP_ADDRESS)
  return Math.random().toString(36).substring(2, 11) + 
         Date.now().toString(36);
}
