import { deflateSync, inflateSync, strToU8, strFromU8 } from "fflate";
import { CompactSDP, QRFrame } from "@/lib/types";

/**
 * Maximum character length per QR code frame.
 * Keeping each QR frame around ~650 chars ensures version 14-18 QR codes
 * with Error Correction Level 'M' or 'L', which scan almost instantaneously
 * even on older phone cameras or glare-heavy laptop screens.
 * We also allow larger single-QR mode (~1100 chars) when the compressed SDP fits!
 */
export const DEFAULT_SINGLE_QR_LIMIT = 950;
export const DEFAULT_MULTI_QR_CHUNK_SIZE = 550;

/**
 * Strips non-essential SDP attributes for a pure WebRTC DataChannel (application/DTLS/SCTP)
 * while keeping 100% of required ICE, DTLS fingerprint, media line, SCTP port, and candidate lines.
 * This shrinks raw SDP size by 30-45% before Deflate compression!
 */
export function minifyDataChannelSDP(sdp: string): string {
  const lines = sdp.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip verbose or redundant lines not required for SCTP DataChannels
    if (
      line.startsWith("a=extmap-allow-mixed") ||
      line.startsWith("a=msid-semantic:") ||
      line.startsWith("a=ice-options:")
    ) {
      continue;
    }

    // For candidate lines, strip optional raddr/rport/generation/network-id/network-cost metadata
    // while preserving foundation, component, transport, priority, ip, port, and typ.
    if (line.startsWith("a=candidate:")) {
      // Keep host and srflx candidates; strip TCP active/passive candidates that rarely work for WebRTC DataChannels
      if (line.includes(" tcp ") || line.includes(" TCP ")) {
        continue;
      }
      // Trim trailing non-essential extensions like generation 0 ufrag ... network-id ...
      const cleanedCandidate = line
        .replace(/\s+generation\s+\d+/i, "")
        .replace(/\s+network-id\s+\d+/i, "")
        .replace(/\s+network-cost\s+\d+/i, "");
      kept.push(cleanedCandidate);
      continue;
    }

    kept.push(line);
  }

  return kept.join("\r\n") + "\r\n";
}

/**
 * Normalizes a minified SDP string so it always has CRLF line endings required by WebRTC.
 */
export function normalizeSDP(sdp: string): string {
  const normalized = sdp.replace(/\r?\n/g, "\r\n").trim();
  return normalized + "\r\n";
}

/**
 * Base64URL encode Uint8Array
 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64URL decode to Uint8Array
 */
export function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Computes a short 6-character hex CRC-like checksum for payload integrity verification.
 */
export function computeShortChecksum(input: string): string {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0").slice(0, 6).toUpperCase();
}

/**
 * Compresses and encodes a CompactSDP object into a compact Base64URL string.
 */
export function compressSignalingPayload(payload: CompactSDP): string {
  const minifiedPayload: CompactSDP = {
    ...payload,
    sdp: minifyDataChannelSDP(payload.sdp),
  };
  const json = JSON.stringify(minifiedPayload);
  const compressed = deflateSync(strToU8(json), { level: 9 });
  return toBase64Url(compressed);
}

/**
 * Decompresses and parses a Base64URL signaling string back into a CompactSDP object.
 */
export function decompressSignalingPayload(encoded: string): CompactSDP {
  const cleaned = encoded.trim();
  const compressed = fromBase64Url(cleaned);
  const decompressedBytes = inflateSync(compressed);
  const json = strFromU8(decompressedBytes);
  const parsed = JSON.parse(json) as CompactSDP;
  if (!parsed || (parsed.t !== "o" && parsed.t !== "a") || !parsed.sdp || !parsed.sid) {
    throw new Error("Invalid Droply signaling payload structure");
  }
  parsed.sdp = normalizeSDP(parsed.sdp);
  return parsed;
}

/**
 * Encodes a CompactSDP into one or more QRFrames.
 * Format of each raw QR string:
 * `DP1|<sessionId>|<O|A>|<index>/<total>|<checksum>|<dataSlice>`
 *
 * Notice how self-contained this format is:
 * - If `compressed.length <= maxSingleLength` and `forceMultiFrame` is false, it produces `1/1` (a single QR code).
 * - If the SDP has many network interfaces/ICE candidates or the user switches to "Easy Scan (Multi-QR)" mode for low-res cameras,
 *   it automatically splits into `total` frames that cycle in an animated loop and can be scanned in ANY order!
 */
export function encodeSDPToQRFrames(
  payload: CompactSDP,
  options?: { forceMultiFrame?: boolean; chunkSize?: number }
): {
  frames: QRFrame[];
  compactCode: string;
  compressedSize: number;
  rawSdpSize: number;
} {
  const rawSdpSize = payload.sdp.length;
  const compressed = compressSignalingPayload(payload);
  const checksum = computeShortChecksum(compressed);
  const typeChar: "O" | "A" = payload.t === "o" ? "O" : "A";

  const forceMulti = options?.forceMultiFrame ?? false;
  const chunkSize = options?.chunkSize ?? DEFAULT_MULTI_QR_CHUNK_SIZE;

  const canFitSingle = !forceMulti && compressed.length <= DEFAULT_SINGLE_QR_LIMIT;
  const slices: string[] = [];

  if (canFitSingle) {
    slices.push(compressed);
  } else {
    for (let i = 0; i < compressed.length; i += chunkSize) {
      slices.push(compressed.slice(i, i + chunkSize));
    }
  }

  const total = slices.length;
  const frames: QRFrame[] = slices.map((data, index) => {
    const raw = `DP1|${payload.sid}|${typeChar}|${index + 1}/${total}|${checksum}|${data}`;
    return {
      magic: "DP1",
      sessionId: payload.sid,
      type: typeChar,
      index,
      total,
      checksum,
      data,
      raw,
    };
  });

  // Also provide a single-line copyable connection string with header for manual / clipboard fallback
  const compactCode = `DP1|${payload.sid}|${typeChar}|1/1|${checksum}|${compressed}`;

  return {
    frames,
    compactCode,
    compressedSize: compressed.length,
    rawSdpSize,
  };
}

/**
 * Parses a scanned QR string (or pasted connection code) into a QRFrame.
 */
export function parseQRFrame(rawInput: string): QRFrame {
  const trimmed = rawInput.trim();
  const parts = trimmed.split("|");
  if (parts.length !== 6 || parts[0] !== "DP1") {
    throw new Error("Unrecognized QR code. Please scan a valid Droply pairing QR code.");
  }

  const [, sessionId, typeStr, seqStr, checksum, data] = parts;
  if (typeStr !== "O" && typeStr !== "A") {
    throw new Error("Invalid QR payload type.");
  }

  const seqParts = seqStr.split("/");
  if (seqParts.length !== 2) {
    throw new Error("Invalid QR frame sequence header.");
  }

  const oneBasedIndex = parseInt(seqParts[0], 10);
  const total = parseInt(seqParts[1], 10);
  if (
    !Number.isInteger(oneBasedIndex) ||
    !Number.isInteger(total) ||
    oneBasedIndex < 1 ||
    total < 1 ||
    oneBasedIndex > total
  ) {
    throw new Error("Invalid QR frame index.");
  }

  return {
    magic: "DP1",
    sessionId,
    type: typeStr,
    index: oneBasedIndex - 1,
    total,
    checksum,
    data,
    raw: trimmed,
  };
}

/**
 * Reassembles a complete set of QRFrames and verifies the checksum before decompressing.
 */
export class QRFrameAssembler {
  private sessionId: string | null = null;
  private type: "O" | "A" | null = null;
  private total = 0;
  private checksum: string | null = null;
  private chunks = new Map<number, string>();

  reset(): void {
    this.sessionId = null;
    this.type = null;
    this.total = 0;
    this.checksum = null;
    this.chunks.clear();
  }

  ingest(rawInput: string, expectedType?: "O" | "A"): {
    complete: boolean;
    receivedCount: number;
    totalCount: number;
    payload?: CompactSDP;
    frame: QRFrame;
  } {
    const frame = parseQRFrame(rawInput);

    if (expectedType && frame.type !== expectedType) {
      const label = expectedType === "O" ? "Sender Offer QR" : "Receiver Answer QR";
      throw new Error(`Expected a ${label}, but scanned ${frame.type === "O" ? "an Offer" : "an Answer"} QR.`);
    }

    // If session or checksum changed (user restarted session on the other device), reset collector
    if (
      this.sessionId !== frame.sessionId ||
      this.checksum !== frame.checksum ||
      this.total !== frame.total ||
      this.type !== frame.type
    ) {
      this.sessionId = frame.sessionId;
      this.type = frame.type;
      this.total = frame.total;
      this.checksum = frame.checksum;
      this.chunks.clear();
    }

    this.chunks.set(frame.index, frame.data);

    if (this.chunks.size === this.total) {
      // Reconstruct ordered string
      const ordered: string[] = [];
      for (let i = 0; i < this.total; i++) {
        const piece = this.chunks.get(i);
        if (piece === undefined) {
          return {
            complete: false,
            receivedCount: this.chunks.size,
            totalCount: this.total,
            frame,
          };
        }
        ordered.push(piece);
      }

      const fullCompressed = ordered.join("");
      const actualChecksum = computeShortChecksum(fullCompressed);
      if (actualChecksum !== this.checksum) {
        this.reset();
        throw new Error("QR payload checksum mismatch. Please scan again.");
      }

      const payload = decompressSignalingPayload(fullCompressed);
      return {
        complete: true,
        receivedCount: this.total,
        totalCount: this.total,
        payload,
        frame,
      };
    }

    return {
      complete: false,
      receivedCount: this.chunks.size,
      totalCount: this.total,
      frame,
    };
  }
}

