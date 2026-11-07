import { FileMetadata } from "@/lib/types";

/**
 * Generates a cryptographically strong random hex token.
 */
export function generateSecureToken(byteLength = 12): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback if crypto.getRandomValues is unavailable
  return Array.from({ length: byteLength * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Generates a short human-readable session ID (8 alphanumeric chars).
 */
export function generateSessionId(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  }
  return Array.from({ length: 8 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

/**
 * Strips any directory path components and control characters from a filename
 * to prevent path traversal or spoofing and ensure no local filesystem path is leaked.
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") {
    return "unnamed_file";
  }
  // Strip any Windows or POSIX directory separators
  const baseName = rawName.split(/[\\/]/).pop() || "unnamed_file";
  // Remove control characters and null bytes
  const cleaned = baseName
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/^\.+/, "")
    .trim();
  return cleaned.slice(0, 255) || "unnamed_file";
}

/**
 * Validates incoming FileMetadata from a peer before accepting transfer.
 */
export function validateFileMetadata(meta: unknown): meta is FileMetadata {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  if (typeof m.id !== "string" || m.id.length < 1 || m.id.length > 64) return false;
  if (typeof m.name !== "string" || m.name.length < 1 || m.name.length > 255) return false;
  if (typeof m.size !== "number" || !Number.isFinite(m.size) || m.size < 0) return false;
  if (typeof m.type !== "string") return false;
  if (typeof m.totalChunks !== "number" || !Number.isInteger(m.totalChunks) || m.totalChunks < 0)
    return false;
  if (typeof m.chunkSize !== "number" || !Number.isInteger(m.chunkSize) || m.chunkSize <= 0)
    return false;
  if (typeof m.sha256 !== "string" || m.sha256.length < 8) return false;
  return true;
}

/**
 * Pure JavaScript SHA-256 implementation as a fallback for non-secure contexts
 * where crypto.subtle is unavailable (e.g., plain HTTP over LAN IP during testing),
 * while preferring native Web Crypto API (`crypto.subtle.digest`) whenever available.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class IncrementalSHA256 {
  private h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private bytesProcessed = 0;
  private w = new Uint32Array(64);

  update(data: Uint8Array): void {
    let offset = 0;
    const len = data.length;
    this.bytesProcessed += len;

    if (this.bufferLength > 0) {
      const needed = 64 - this.bufferLength;
      if (len < needed) {
        this.buffer.set(data, this.bufferLength);
        this.bufferLength += len;
        return;
      }
      this.buffer.set(data.subarray(0, needed), this.bufferLength);
      this.compressBlock(this.buffer, 0);
      this.bufferLength = 0;
      offset += needed;
    }

    while (offset + 64 <= len) {
      this.compressBlock(data, offset);
      offset += 64;
    }

    if (offset < len) {
      this.buffer.set(data.subarray(offset), 0);
      this.bufferLength = len - offset;
    }
  }

  private compressBlock(block: Uint8Array, offset: number): void {
    const w = this.w;
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((block[j] << 24) |
          (block[j + 1] << 16) |
          (block[j + 2] << 8) |
          block[j + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const v1 = w[i - 15];
      const s0 =
        (((v1 >>> 7) | (v1 << 25)) ^
          ((v1 >>> 18) | (v1 << 14)) ^
          (v1 >>> 3)) >>>
        0;
      const v2 = w[i - 2];
      const s1 =
        (((v2 >>> 17) | (v2 << 15)) ^
          ((v2 >>> 19) | (v2 << 13)) ^
          (v2 >>> 10)) >>>
        0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = this.h;

    for (let i = 0; i < 64; i++) {
      const S1 =
        (((e >>> 6) | (e << 26)) ^
          ((e >>> 11) | (e << 21)) ^
          ((e >>> 25) | (e << 7))) >>>
        0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 =
        (((a >>> 2) | (a << 30)) ^
          ((a >>> 13) | (a << 19)) ^
          ((a >>> 22) | (a << 10))) >>>
        0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    this.h[0] = (this.h[0] + a) >>> 0;
    this.h[1] = (this.h[1] + b) >>> 0;
    this.h[2] = (this.h[2] + c) >>> 0;
    this.h[3] = (this.h[3] + d) >>> 0;
    this.h[4] = (this.h[4] + e) >>> 0;
    this.h[5] = (this.h[5] + f) >>> 0;
    this.h[6] = (this.h[6] + g) >>> 0;
    this.h[7] = (this.h[7] + h) >>> 0;
  }

  digestHex(): string {
    const bitLengthHigh = Math.floor((this.bytesProcessed * 8) / 0x100000000);
    const bitLengthLow = (this.bytesProcessed * 8) >>> 0;

    this.buffer[this.bufferLength++] = 0x80;
    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength, 64);
      this.compressBlock(this.buffer, 0);
      this.bufferLength = 0;
    }
    this.buffer.fill(0, this.bufferLength, 56);
    const view = new DataView(this.buffer.buffer);
    view.setUint32(56, bitLengthHigh, false);
    view.setUint32(60, bitLengthLow, false);
    this.compressBlock(this.buffer, 0);

    return Array.from(this.h, (word) => word.toString(16).padStart(8, "0")).join("");
  }
}

/**
 * Computes SHA-256 hash of a Blob or File.
 * For files <= 32 MB when Web Crypto API is available, uses native `crypto.subtle.digest`.
 * For larger files, streams in 2 MB slices via `IncrementalSHA256` so we never load a huge file into memory at once!
 */
export async function computeBlobSHA256(blob: Blob): Promise<string> {
  const MAX_SINGLE_BUFFER = 32 * 1024 * 1024; // 32 MB
  if (
    blob.size <= MAX_SINGLE_BUFFER &&
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof crypto.subtle.digest === "function"
  ) {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Incremental chunked hashing for large files (or non-HTTPS local IP contexts)
  const hasher = new IncrementalSHA256();
  const sliceSize = 2 * 1024 * 1024; // 2 MB slices
  let offset = 0;
  while (offset < blob.size) {
    const slice = blob.slice(offset, Math.min(offset + sliceSize, blob.size));
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += sliceSize;
  }
  return hasher.digestHex();
}

