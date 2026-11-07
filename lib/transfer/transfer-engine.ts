import {
  FileMetadata,
  FileTransferProgress,
  SelectedFileItem,
  TransferManifest,
} from "@/lib/types";
import {
  computeBlobSHA256,
  IncrementalSHA256,
  sanitizeFileName,
  validateFileMetadata,
} from "@/lib/security/crypto";

export const CHUNK_SIZE = 64 * 1024; // 64 KB as recommended in specification
const BUFFER_LOW_THRESHOLD = 256 * 1024; // 256 KB
const BUFFER_HIGH_WATERMARK = 1024 * 1024; // 1 MB

type ControlMessage =
  | {
      type: "MANIFEST";
      manifest: TransferManifest;
    }
  | {
      type: "ACCEPT_MANIFEST";
      sessionId: string;
      /** Map of fileId -> next chunkIndex to resume from (0 for fresh transfer) */
      resumeOffsets: Record<string, number>;
    }
  | {
      type: "REJECT_MANIFEST";
      sessionId: string;
      reason?: string;
    }
  | {
      type: "FILE_START";
      fileId: string;
      fileIndex: number;
      startChunk: number;
    }
  | {
      type: "FILE_COMPLETE";
      fileId: string;
      fileIndex: number;
    }
  | {
      type: "FILE_VERIFIED";
      fileId: string;
      verified: boolean;
      sha256Actual: string;
    }
  | {
      type: "FILE_CONTROL";
      fileId: string;
      action: "pause" | "resume" | "cancel" | "retry";
      resumeChunk?: number;
    }
  | {
      type: "SESSION_COMPLETE";
      sessionId: string;
    };

interface IncomingFileBuffer {
  meta: FileMetadata;
  fileIndex: number;
  chunks: Array<Uint8Array | undefined>;
  receivedChunks: number;
  bytesReceived: number;
  hasher: IncrementalSHA256;
  nextSequentialHashChunk: number;
  startedAt: number;
  lastTickTime: number;
  lastTickBytes: number;
  currentSpeedMBps: number;
}

export interface TransferEngineCallbacks {
  onManifestReceived?: (manifest: TransferManifest) => void;
  onManifestAccepted?: () => void;
  onManifestRejected?: (reason: string) => void;
  onProgressUpdate?: (progressList: FileTransferProgress[]) => void;
  onSessionCompleted?: (progressList: FileTransferProgress[]) => void;
  onError?: (error: string) => void;
}

export class FileTransferEngine {
  private channel: RTCDataChannel | null = null;
  private callbacks: TransferEngineCallbacks;
  private progressMap = new Map<string, FileTransferProgress>();
  private selectedFiles: SelectedFileItem[] = [];
  private manifest: TransferManifest | null = null;
  private incomingBuffers = new Map<string, IncomingFileBuffer>();
  private fileIndexToId = new Map<number, string>();
  private pausedFiles = new Set<string>();
  private cancelledFiles = new Set<string>();
  private isSendingLoopActive = false;
  private objectUrls: string[] = [];

  constructor(callbacks: TransferEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public attachChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.binaryType = "arraybuffer";
    try {
      channel.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;
    } catch {
      // Ignore if browser does not support setting bufferedAmountLowThreshold
    }

    channel.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        this.handleControlMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this.handleBinaryChunk(event.data);
      } else if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buf) => this.handleBinaryChunk(buf));
      }
    };
  }

  public getProgressList(): FileTransferProgress[] {
    return Array.from(this.progressMap.values());
  }

  private emitProgress(): void {
    this.callbacks.onProgressUpdate?.(this.getProgressList());
  }

  private sendControl(msg: ControlMessage): void {
    if (!this.channel || this.channel.readyState !== "open") {
      return;
    }
    this.channel.send(JSON.stringify(msg));
  }

  /**
   * Sender: Prepares the file manifest (calculating SHA-256 hashes for integrity verification)
   * and sends it to the connected Receiver for explicit user acceptance.
   */
  public async prepareAndSendManifest(options: {
    sessionId: string;
    sessionToken: string;
    senderName: string;
    files: SelectedFileItem[];
  }): Promise<TransferManifest> {
    this.selectedFiles = options.files;
    this.progressMap.clear();
    this.pausedFiles.clear();
    this.cancelledFiles.clear();

    const metadataList: FileMetadata[] = [];
    let totalSize = 0;

    for (const item of options.files) {
      const sanitizedName = sanitizeFileName(item.name);
      const sha256 = item.sha256 || (await computeBlobSHA256(item.file));
      item.sha256 = sha256;
      const totalChunks = Math.max(1, Math.ceil(item.size / CHUNK_SIZE));

      const meta: FileMetadata = {
        id: item.id,
        name: sanitizedName,
        size: item.size,
        type: item.type || "application/octet-stream",
        totalChunks,
        chunkSize: CHUNK_SIZE,
        sha256,
        lastModified: item.lastModified,
      };
      metadataList.push(meta);
      totalSize += item.size;

      this.progressMap.set(item.id, {
        fileId: item.id,
        fileName: sanitizedName,
        fileType: meta.type,
        fileSize: item.size,
        bytesTransferred: 0,
        chunksTransferred: 0,
        totalChunks,
        percentage: 0,
        speedMBps: 0,
        estimatedSecondsRemaining: null,
        status: "awaiting-acceptance",
        sha256Expected: sha256,
      });
    }

    const manifest: TransferManifest = {
      sessionId: options.sessionId,
      sessionToken: options.sessionToken,
      senderName: options.senderName,
      files: metadataList,
      totalSize,
      createdAt: Date.now(),
    };

    this.manifest = manifest;
    this.emitProgress();
    this.sendControl({
      type: "MANIFEST",
      manifest,
    });

    return manifest;
  }

  /**
   * Receiver: Explicitly accepts the incoming manifest and notifies the Sender to start sending chunks.
   */
  public acceptIncomingManifest(): void {
    if (!this.manifest) return;

    const resumeOffsets: Record<string, number> = {};
    for (const fileMeta of this.manifest.files) {
      const existing = this.incomingBuffers.get(fileMeta.id);
      const resumeChunk = existing ? existing.nextSequentialHashChunk : 0;
      resumeOffsets[fileMeta.id] = resumeChunk;

      const prog = this.progressMap.get(fileMeta.id);
      if (prog && prog.status === "awaiting-acceptance") {
        prog.status = "queued";
      }
    }

    this.emitProgress();
    this.sendControl({
      type: "ACCEPT_MANIFEST",
      sessionId: this.manifest.sessionId,
      resumeOffsets,
    });
  }

  /**
   * Receiver: Explicitly rejects the incoming manifest.
   */
  public rejectIncomingManifest(reason = "Transfer declined by receiver"): void {
    if (!this.manifest) return;
    for (const prog of this.progressMap.values()) {
      prog.status = "cancelled";
      prog.error = reason;
    }
    this.emitProgress();
    this.sendControl({
      type: "REJECT_MANIFEST",
      sessionId: this.manifest.sessionId,
      reason,
    });
  }

  /**
   * Pause, Resume, Cancel, or Retry a specific file.
   */
  public controlFileTransfer(
    fileId: string,
    action: "pause" | "resume" | "cancel" | "retry"
  ): void {
    const prog = this.progressMap.get(fileId);
    if (!prog) return;

    if (action === "pause") {
      this.pausedFiles.add(fileId);
      prog.status = "paused";
      prog.speedMBps = 0;
      this.emitProgress();
      this.sendControl({ type: "FILE_CONTROL", fileId, action: "pause" });
    } else if (action === "resume") {
      this.pausedFiles.delete(fileId);
      prog.status = "transferring";
      this.emitProgress();
      const buf = this.incomingBuffers.get(fileId);
      const resumeChunk = buf ? buf.nextSequentialHashChunk : prog.chunksTransferred;
      this.sendControl({
        type: "FILE_CONTROL",
        fileId,
        action: "resume",
        resumeChunk,
      });
    } else if (action === "cancel") {
      this.cancelledFiles.add(fileId);
      this.pausedFiles.delete(fileId);
      prog.status = "cancelled";
      prog.speedMBps = 0;
      prog.estimatedSecondsRemaining = null;
      this.incomingBuffers.delete(fileId);
      this.emitProgress();
      this.sendControl({ type: "FILE_CONTROL", fileId, action: "cancel" });
    } else if (action === "retry") {
      this.cancelledFiles.delete(fileId);
      this.pausedFiles.delete(fileId);
      prog.status = "queued";
      prog.bytesTransferred = 0;
      prog.chunksTransferred = 0;
      prog.percentage = 0;
      prog.error = undefined;
      this.emitProgress();
      this.sendControl({
        type: "FILE_CONTROL",
        fileId,
        action: "retry",
        resumeChunk: 0,
      });
    }
  }

  private handleControlMessage(rawJson: string): void {
    let msg: ControlMessage;
    try {
      msg = JSON.parse(rawJson) as ControlMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "MANIFEST": {
        const { manifest } = msg;
        if (!manifest || !Array.isArray(manifest.files)) {
          this.callbacks.onError?.("Received malformed file manifest from peer.");
          return;
        }

        // Validate and sanitize every incoming file metadata entry
        const validatedFiles: FileMetadata[] = [];
        for (let idx = 0; idx < manifest.files.length; idx++) {
          const rawMeta = manifest.files[idx];
          if (!validateFileMetadata(rawMeta)) {
            this.callbacks.onError?.("Rejected invalid file metadata in manifest.");
            return;
          }
          const cleanMeta: FileMetadata = {
            ...rawMeta,
            name: sanitizeFileName(rawMeta.name),
          };
          validatedFiles.push(cleanMeta);
          this.fileIndexToId.set(idx, cleanMeta.id);

          this.incomingBuffers.set(cleanMeta.id, {
            meta: cleanMeta,
            fileIndex: idx,
            chunks: new Array(cleanMeta.totalChunks),
            receivedChunks: 0,
            bytesReceived: 0,
            hasher: new IncrementalSHA256(),
            nextSequentialHashChunk: 0,
            startedAt: Date.now(),
            lastTickTime: Date.now(),
            lastTickBytes: 0,
            currentSpeedMBps: 0,
          });

          this.progressMap.set(cleanMeta.id, {
            fileId: cleanMeta.id,
            fileName: cleanMeta.name,
            fileType: cleanMeta.type,
            fileSize: cleanMeta.size,
            bytesTransferred: 0,
            chunksTransferred: 0,
            totalChunks: cleanMeta.totalChunks,
            percentage: 0,
            speedMBps: 0,
            estimatedSecondsRemaining: null,
            status: "awaiting-acceptance",
            sha256Expected: cleanMeta.sha256,
          });
        }

        this.manifest = {
          ...manifest,
          files: validatedFiles,
        };
        this.emitProgress();
        this.callbacks.onManifestReceived?.(this.manifest);
        break;
      }

      case "ACCEPT_MANIFEST": {
        this.callbacks.onManifestAccepted?.();
        void this.startSendingFiles(msg.resumeOffsets || {});
        break;
      }

      case "REJECT_MANIFEST": {
        const reason = msg.reason || "Receiver declined the file transfer.";
        for (const prog of this.progressMap.values()) {
          prog.status = "cancelled";
          prog.error = reason;
        }
        this.emitProgress();
        this.callbacks.onManifestRejected?.(reason);
        break;
      }

      case "FILE_START": {
        const prog = this.progressMap.get(msg.fileId);
        const buf = this.incomingBuffers.get(msg.fileId);
        if (prog && prog.status !== "cancelled") {
          prog.status = "transferring";
          prog.startedAt = prog.startedAt || Date.now();
        }
        if (buf && msg.startChunk === 0) {
          buf.startedAt = Date.now();
          buf.lastTickTime = Date.now();
          buf.lastTickBytes = 0;
        }
        this.emitProgress();
        break;
      }

      case "FILE_COMPLETE": {
        void this.finalizeIncomingFile(msg.fileId);
        break;
      }

      case "FILE_VERIFIED": {
        const prog = this.progressMap.get(msg.fileId);
        if (prog) {
          prog.verified = msg.verified;
          prog.sha256Actual = msg.sha256Actual;
          prog.status = msg.verified ? "completed" : "verification-failed";
          prog.completedAt = Date.now();
          prog.speedMBps = 0;
          prog.estimatedSecondsRemaining = 0;
          if (!msg.verified) {
            prog.error = "SHA-256 checksum mismatch detected on receiver.";
          }
          this.emitProgress();
          this.checkIfAllFilesDone();
        }
        break;
      }

      case "FILE_CONTROL": {
        const prog = this.progressMap.get(msg.fileId);
        if (!prog) return;
        if (msg.action === "pause") {
          this.pausedFiles.add(msg.fileId);
          prog.status = "paused";
          prog.speedMBps = 0;
          this.emitProgress();
        } else if (msg.action === "resume") {
          this.pausedFiles.delete(msg.fileId);
          prog.status = "transferring";
          this.emitProgress();
        } else if (msg.action === "cancel") {
          this.cancelledFiles.add(msg.fileId);
          this.pausedFiles.delete(msg.fileId);
          prog.status = "cancelled";
          prog.speedMBps = 0;
          this.incomingBuffers.delete(msg.fileId);
          this.emitProgress();
        } else if (msg.action === "retry") {
          this.cancelledFiles.delete(msg.fileId);
          this.pausedFiles.delete(msg.fileId);
          prog.status = "queued";
          this.emitProgress();
          if (this.selectedFiles.length > 0 && !this.isSendingLoopActive) {
            void this.startSendingFiles({ [msg.fileId]: msg.resumeChunk || 0 });
          }
        }
        break;
      }

      case "SESSION_COMPLETE": {
        this.checkIfAllFilesDone();
        break;
      }
    }
  }

  /**
   * Waits until RTCDataChannel.bufferedAmount drops below BUFFER_HIGH_WATERMARK.
   */
  private waitForChannelDrain(channel: RTCDataChannel): Promise<void> {
    if (channel.bufferedAmount < BUFFER_HIGH_WATERMARK) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(pollTimer);
        channel.removeEventListener("bufferedamountlow", onLow);
        resolve();
      };

      const onLow = () => {
        if (channel.bufferedAmount <= BUFFER_LOW_THRESHOLD) {
          finish();
        }
      };

      const pollTimer = setInterval(() => {
        if (
          channel.readyState !== "open" ||
          channel.bufferedAmount <= BUFFER_LOW_THRESHOLD
        ) {
          finish();
        }
      }, 20);

      channel.addEventListener("bufferedamountlow", onLow);
    });
  }

  /**
   * Waits while a specific file is paused by either peer.
   */
  private waitWhilePaused(fileId: string): Promise<void> {
    if (!this.pausedFiles.has(fileId)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (
          !this.pausedFiles.has(fileId) ||
          this.cancelledFiles.has(fileId) ||
          this.channel?.readyState !== "open"
        ) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Sender: Streams each file in 64 KB chunks via Blob.slice() with backpressure management.
   */
  private async startSendingFiles(resumeOffsets: Record<string, number>): Promise<void> {
    if (this.isSendingLoopActive || !this.manifest || !this.channel) return;
    this.isSendingLoopActive = true;

    try {
      for (let fileIndex = 0; fileIndex < this.manifest.files.length; fileIndex++) {
        const meta = this.manifest.files[fileIndex];
        const selected = this.selectedFiles.find((f) => f.id === meta.id);
        const prog = this.progressMap.get(meta.id);
        if (!selected || !prog) continue;
        if (this.cancelledFiles.has(meta.id) || prog.status === "completed") continue;

        const startChunk = Math.max(0, resumeOffsets[meta.id] || 0);
        prog.status = "transferring";
        prog.startedAt = Date.now();
        prog.chunksTransferred = startChunk;
        prog.bytesTransferred = Math.min(meta.size, startChunk * CHUNK_SIZE);
        this.emitProgress();

        this.sendControl({
          type: "FILE_START",
          fileId: meta.id,
          fileIndex,
          startChunk,
        });

        // Handle 0-byte empty files gracefully
        if (meta.size === 0) {
          prog.percentage = 100;
          prog.chunksTransferred = 1;
          prog.status = "verifying";
          this.emitProgress();
          this.sendControl({
            type: "FILE_COMPLETE",
            fileId: meta.id,
            fileIndex,
          });
          continue;
        }

        let lastUiUpdateTime = performance.now();
        let bytesSinceLastUiUpdate = 0;

        for (let chunkIndex = startChunk; chunkIndex < meta.totalChunks; chunkIndex++) {
          if (this.cancelledFiles.has(meta.id)) {
            break;
          }
          if (this.pausedFiles.has(meta.id)) {
            await this.waitWhilePaused(meta.id);
            lastUiUpdateTime = performance.now();
            bytesSinceLastUiUpdate = 0;
            if (this.cancelledFiles.has(meta.id)) break;
          }

          if (!this.channel || this.channel.readyState !== "open") {
            prog.status = "error";
            prog.error = "Connection lost during file transfer.";
            this.emitProgress();
            this.callbacks.onError?.("WebRTC DataChannel closed during transfer.");
            return;
          }

          await this.waitForChannelDrain(this.channel);

          const startByte = chunkIndex * CHUNK_SIZE;
          const endByte = Math.min(startByte + CHUNK_SIZE, meta.size);
          const sliceBlob = selected.file.slice(startByte, endByte);
          const chunkBuffer = await sliceBlob.arrayBuffer();
          const chunkBytes = new Uint8Array(chunkBuffer);

          // Construct 8-byte binary header: [fileIndex (Uint32 BE), chunkIndex (Uint32 BE)] + chunkBytes
          const packet = new Uint8Array(8 + chunkBytes.byteLength);
          const view = new DataView(packet.buffer);
          view.setUint32(0, fileIndex, false);
          view.setUint32(4, chunkIndex, false);
          packet.set(chunkBytes, 8);

          this.channel.send(packet.buffer);

          prog.chunksTransferred = chunkIndex + 1;
          prog.bytesTransferred = endByte;
          prog.percentage = Math.min(100, Math.round((endByte / meta.size) * 100));
          bytesSinceLastUiUpdate += chunkBytes.byteLength;

          const now = performance.now();
          const elapsedMs = now - lastUiUpdateTime;
          if (elapsedMs >= 120 || chunkIndex === meta.totalChunks - 1) {
            const instantMBps =
              elapsedMs > 0 ? bytesSinceLastUiUpdate / (1024 * 1024) / (elapsedMs / 1000) : 0;
            prog.speedMBps =
              prog.speedMBps > 0
                ? Number((prog.speedMBps * 0.65 + instantMBps * 0.35).toFixed(2))
                : Number(instantMBps.toFixed(2));
            const remainingBytes = meta.size - endByte;
            prog.estimatedSecondsRemaining =
              prog.speedMBps > 0
                ? Math.ceil(remainingBytes / (prog.speedMBps * 1024 * 1024))
                : null;

            lastUiUpdateTime = now;
            bytesSinceLastUiUpdate = 0;
            this.emitProgress();
          }
        }

        if (!this.cancelledFiles.has(meta.id)) {
          prog.status = "verifying";
          prog.percentage = 100;
          prog.estimatedSecondsRemaining = 0;
          this.emitProgress();

          this.sendControl({
            type: "FILE_COMPLETE",
            fileId: meta.id,
            fileIndex,
          });
        }
      }

      if (this.manifest) {
        this.sendControl({
          type: "SESSION_COMPLETE",
          sessionId: this.manifest.sessionId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "File transfer failed.";
      this.callbacks.onError?.(message);
    } finally {
      this.isSendingLoopActive = false;
    }
  }

  /**
   * Receiver: Handles an incoming binary packet [fileIndex:4B][chunkIndex:4B][payload]
   */
  private handleBinaryChunk(buffer: ArrayBuffer): void {
    if (buffer.byteLength < 8) return;
    const view = new DataView(buffer);
    const fileIndex = view.getUint32(0, false);
    const chunkIndex = view.getUint32(4, false);
    const payload = new Uint8Array(buffer, 8);

    const fileId = this.fileIndexToId.get(fileIndex);
    if (!fileId || this.cancelledFiles.has(fileId)) return;

    const incoming = this.incomingBuffers.get(fileId);
    const prog = this.progressMap.get(fileId);
    if (!incoming || !prog) return;

    if (chunkIndex >= incoming.meta.totalChunks) return;

    // Avoid double-counting if a chunk was retransmitted
    if (!incoming.chunks[chunkIndex]) {
      // Copy slice so underlying buffer can be GC'd cleanly
      const copy = new Uint8Array(payload.byteLength);
      copy.set(payload);
      incoming.chunks[chunkIndex] = copy;
      incoming.receivedChunks += 1;
      incoming.bytesReceived += copy.byteLength;

      // Advance incremental SHA-256 hasher for all contiguous chunks available so far
      while (
        incoming.nextSequentialHashChunk < incoming.meta.totalChunks &&
        incoming.chunks[incoming.nextSequentialHashChunk] !== undefined
      ) {
        incoming.hasher.update(incoming.chunks[incoming.nextSequentialHashChunk]!);
        incoming.nextSequentialHashChunk += 1;
      }
    }

    prog.status = "transferring";
    prog.chunksTransferred = incoming.receivedChunks;
    prog.bytesTransferred = incoming.bytesReceived;
    prog.percentage =
      incoming.meta.size > 0
        ? Math.min(100, Math.round((incoming.bytesReceived / incoming.meta.size) * 100))
        : 100;

    const now = Date.now();
    const dt = now - incoming.lastTickTime;
    if (dt >= 120 || incoming.receivedChunks === incoming.meta.totalChunks) {
      const dBytes = incoming.bytesReceived - incoming.lastTickBytes;
      const instantMBps = dt > 0 ? dBytes / (1024 * 1024) / (dt / 1000) : 0;
      incoming.currentSpeedMBps =
        incoming.currentSpeedMBps > 0
          ? Number((incoming.currentSpeedMBps * 0.65 + instantMBps * 0.35).toFixed(2))
          : Number(instantMBps.toFixed(2));
      prog.speedMBps = incoming.currentSpeedMBps;
      const remBytes = Math.max(0, incoming.meta.size - incoming.bytesReceived);
      prog.estimatedSecondsRemaining =
        prog.speedMBps > 0 ? Math.ceil(remBytes / (prog.speedMBps * 1024 * 1024)) : null;

      incoming.lastTickTime = now;
      incoming.lastTickBytes = incoming.bytesReceived;
      this.emitProgress();
    }
  }

  /**
   * Receiver: Reconstructs the Blob, verifies SHA-256 integrity, generates download URL,
   * and sends verification acknowledgment back to the Sender.
   */
  private async finalizeIncomingFile(fileId: string): Promise<void> {
    const incoming = this.incomingBuffers.get(fileId);
    const prog = this.progressMap.get(fileId);
    if (!incoming || !prog) return;

    prog.status = "verifying";
    this.emitProgress();

    try {
      // Ensure any remaining contiguous chunks are hashed
      while (
        incoming.nextSequentialHashChunk < incoming.meta.totalChunks &&
        incoming.chunks[incoming.nextSequentialHashChunk] !== undefined
      ) {
        incoming.hasher.update(incoming.chunks[incoming.nextSequentialHashChunk]!);
        incoming.nextSequentialHashChunk += 1;
      }

      const orderedParts: BlobPart[] = [];
      for (let i = 0; i < incoming.meta.totalChunks; i++) {
        const chunk = incoming.chunks[i];
        if (chunk) {
          orderedParts.push(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer);
        }
      }

      const reconstructedBlob = new Blob(orderedParts, {
        type: incoming.meta.type || "application/octet-stream",
      });

      const sha256Actual =
        incoming.meta.size === 0
          ? await computeBlobSHA256(reconstructedBlob)
          : incoming.hasher.digestHex();

      const verified =
        sha256Actual.toLowerCase() === incoming.meta.sha256.toLowerCase();

      const downloadUrl = URL.createObjectURL(reconstructedBlob);
      this.objectUrls.push(downloadUrl);

      prog.sha256Actual = sha256Actual;
      prog.verified = verified;
      prog.downloadUrl = downloadUrl;
      prog.bytesTransferred = incoming.meta.size;
      prog.percentage = 100;
      prog.speedMBps = 0;
      prog.estimatedSecondsRemaining = 0;
      prog.completedAt = Date.now();
      prog.status = verified ? "completed" : "verification-failed";
      if (!verified) {
        prog.error = "SHA-256 verification failed! The received file may be corrupted.";
      }

      // Free memory of raw chunk array now that the Blob is constructed
      incoming.chunks = [];

      this.emitProgress();

      this.sendControl({
        type: "FILE_VERIFIED",
        fileId,
        verified,
        sha256Actual,
      });

      this.checkIfAllFilesDone();
    } catch (err) {
      prog.status = "error";
      prog.error =
        err instanceof Error ? err.message : "Failed to reconstruct or verify file.";
      this.emitProgress();
    }
  }

  private checkIfAllFilesDone(): void {
    const list = this.getProgressList();
    if (list.length === 0) return;
    const allFinished = list.every(
      (p) =>
        p.status === "completed" ||
        p.status === "verification-failed" ||
        p.status === "cancelled"
    );
    if (allFinished) {
      this.callbacks.onSessionCompleted?.(list);
    }
  }

  public cleanup(): void {
    this.isSendingLoopActive = false;
    this.incomingBuffers.clear();
    this.pausedFiles.clear();
    this.cancelledFiles.clear();
    for (const url of this.objectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore revoke errors
      }
    }
    this.objectUrls = [];
  }
}

