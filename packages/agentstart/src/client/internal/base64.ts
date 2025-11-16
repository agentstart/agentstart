/* agent-frontmatter:start
AGENT: Blob base64 utilities
PURPOSE: Encode binary payloads for transport between client and blob router
USAGE: arrayBufferToBase64(arrayBuffer)
EXPORTS: arrayBufferToBase64
FEATURES:
  - Handles arbitrary binary data without dropping null bytes
  - Chunked conversion to avoid blowing up call stacks
  - Throws when no encoder is available (Node polyfills must provide btoa)
SEARCHABLE: base64 encode, blob upload helpers
agent-frontmatter:end */

/**
 * Convert an ArrayBuffer into a base64 string that the blob router can accept.
 * Chunked concatenation avoids call stack limits when dealing with large files.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    let chunk = "";
    const end = Math.min(i + chunkSize, bytes.length);
    for (let j = i; j < end; j += 1) {
      chunk += String.fromCharCode(bytes[j]);
    }
    binary += chunk;
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  throw new Error(
    "Base64 encoding is not available in this environment. Provide a global btoa implementation.",
  );
}
