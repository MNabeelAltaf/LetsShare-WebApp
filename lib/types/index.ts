export type PeerRole = "sender" | "receiver" | "idle";

export type SignalingMode = "offline-local" | "online-stun";

export type WebRTCConnectionState =
  | "idle"
  | "creating-offer"
  | "awaiting-answer-scan"
  | "processing-offer"
  | "awaiting-peer-connection"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

export type DataChannelState = "closed" | "connecting" | "open" | "closing";

export type RouteType = "direct-lan" | "stun-nat" | "relay-turn" | "unknown";

export interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sha256?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  chunkSize: number;
  sha256: string;
  lastModified: number;
}

export interface TransferManifest {
  sessionId: string;
  sessionToken: string;
  senderName: string;
  files: FileMetadata[];
  totalSize: number;
  createdAt: number;
}

export type FileTransferStatus =
  | "queued"
  | "awaiting-acceptance"
  | "transferring"
  | "paused"
  | "verifying"
  | "completed"
  | "verification-failed"
  | "cancelled"
  | "error";

export interface FileTransferProgress {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  bytesTransferred: number;
  chunksTransferred: number;
  totalChunks: number;
  percentage: number;
  speedMBps: number;
  estimatedSecondsRemaining: number | null;
  status: FileTransferStatus;
  sha256Expected: string;
  sha256Actual?: string;
  verified?: boolean;
  downloadUrl?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface TransferSessionSummary {
  sessionId: string;
  role: "sender" | "receiver";
  peerName: string;
  filesCount: number;
  totalSize: number;
  durationSeconds: number;
  averageSpeedMBps: number;
  allVerified: boolean;
  completedAt: number;
  files: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    verified: boolean;
    sha256: string;
    downloadUrl?: string;
  }>;
}

export interface CompactSDP {
  /** 'o' = offer, 'a' = answer */
  t: "o" | "a";
  /** Session ID */
  sid: string;
  /** Session security token */
  tok: string;
  /** Device label */
  dev: string;
  /** Signaling mode: 0 = offline-local, 1 = online-stun */
  m: 0 | 1;
  /** Full or compacted SDP string */
  sdp: string;
  /** Timestamp (unix seconds) */
  ts: number;
  /** Summary of files (for offer preview) */
  f?: {
    c: number; // file count
    s: number; // total bytes
  };
}

export interface QRFrame {
  /** Protocol prefix: "DP1" */
  magic: "DP1";
  /** Session ID (short 8-char) */
  sessionId: string;
  /** Payload type: "O" (offer) | "A" (answer) */
  type: "O" | "A";
  /** 0-based frame index */
  index: number;
  /** Total number of frames */
  total: number;
  /** CRC32 checksum of full compressed payload */
  checksum: string;
  /** Frame slice of Base64URL compressed data */
  data: string;
  /** Raw encoded string stored in the QR code */
  raw: string;
}

export interface NetworkStatusInfo {
  browserOnline: boolean;
  isSecureContext: boolean;
  serviceWorkerReady: boolean;
  appCachedOffline: boolean;
  webrtcSupported: boolean;
  cameraSupported: boolean;
  connectionType?: string;
}

