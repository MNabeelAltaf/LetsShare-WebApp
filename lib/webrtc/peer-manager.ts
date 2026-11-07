import {
  CompactSDP,
  DataChannelState,
  RouteType,
  SignalingMode,
  WebRTCConnectionState,
} from "@/lib/types";
import { generateSecureToken, generateSessionId } from "@/lib/security/crypto";

export interface PeerManagerCallbacks {
  onConnectionStateChange?: (state: WebRTCConnectionState) => void;
  onDataChannelStateChange?: (state: DataChannelState) => void;
  onRouteDetected?: (route: RouteType, details?: string) => void;
  onError?: (message: string) => void;
  onDataChannelReady?: (channel: RTCDataChannel) => void;
}

const ICE_GATHER_TIMEOUT_LOCAL_MS = 2200;
const ICE_GATHER_TIMEOUT_STUN_MS = 4500;
const CONNECTION_ESTABLISH_TIMEOUT_MS = 25000;
const SESSION_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Returns a friendly device label based on User-Agent without exposing personal details.
 */
export function getLocalDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Droply Device";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android Device";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux Device";
  return "Browser Peer";
}

export class WebRTCPeerManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private callbacks: PeerManagerCallbacks;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string = "";
  private sessionToken: string = "";
  private peerDeviceName: string = "Remote Peer";
  private signalingMode: SignalingMode = "offline-local";
  private state: WebRTCConnectionState = "idle";

  constructor(callbacks: PeerManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getSessionToken(): string {
    return this.sessionToken;
  }

  public getPeerDeviceName(): string {
    return this.peerDeviceName;
  }

  public getDataChannel(): RTCDataChannel | null {
    return this.dc;
  }

  public getConnectionState(): WebRTCConnectionState {
    return this.state;
  }

  private setState(next: WebRTCConnectionState): void {
    this.state = next;
    this.callbacks.onConnectionStateChange?.(next);
  }

  private createPeerConnection(mode: SignalingMode): RTCPeerConnection {
    this.cleanupPeerConnection();
    this.signalingMode = mode;

    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
      throw new Error("WebRTC (RTCPeerConnection) is not supported in this browser.");
    }

    const config: RTCConfiguration = {
      // Crucial requirement: In strict offline/hotspot mode, use ZERO external STUN/TURN servers
      // so ICE gathering completes rapidly using local interface host candidates without internet.
      iceServers:
        mode === "online-stun"
          ? [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ]
          : [],
    };

    const pc = new RTCPeerConnection(config);
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const s = this.pc.connectionState;
      if (s === "connecting") {
        this.setState("connecting");
      } else if (s === "connected") {
        this.clearConnectionTimer();
        this.setState("connected");
        void this.inspectActiveRoute();
      } else if (s === "disconnected") {
        this.setState("disconnected");
      } else if (s === "failed") {
        this.clearConnectionTimer();
        this.setState("failed");
        this.callbacks.onError?.(
          "Direct peer-to-peer connection failed. Ensure both devices are on the same Wi-Fi network or mobile hotspot and AP isolation / firewall is not blocking UDP traffic."
        );
      } else if (s === "closed") {
        this.clearConnectionTimer();
        this.setState("closed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const iceState = this.pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        this.clearConnectionTimer();
        if (this.state !== "connected") {
          this.setState("connected");
          void this.inspectActiveRoute();
        }
      } else if (iceState === "failed") {
        this.clearConnectionTimer();
        this.setState("failed");
        this.callbacks.onError?.(
          "ICE connectivity check failed. Verify both devices share the same local Wi-Fi or mobile hotspot."
        );
      }
    };

    return pc;
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dc = channel;
    channel.binaryType = "arraybuffer";

    const notifyDcState = () => {
      const readyState = channel.readyState as DataChannelState;
      this.callbacks.onDataChannelStateChange?.(readyState);
    };

    notifyDcState();

    channel.onopen = () => {
      this.clearConnectionTimer();
      notifyDcState();
      this.setState("connected");
      void this.inspectActiveRoute();
      this.callbacks.onDataChannelReady?.(channel);
    };

    channel.onclose = () => {
      notifyDcState();
    };

    channel.onerror = () => {
      notifyDcState();
      this.callbacks.onError?.("WebRTC DataChannel encountered a transport error.");
    };
  }

  /**
   * Waits for ICE candidate gathering to finish (or until the timeout elapses after at least 1 candidate is gathered).
   */
  private waitForIceGathering(pc: RTCPeerConnection, mode: SignalingMode): Promise<void> {
    if (pc.iceGatheringState === "complete") {
      return Promise.resolve();
    }

    const timeoutMs =
      mode === "offline-local" ? ICE_GATHER_TIMEOUT_LOCAL_MS : ICE_GATHER_TIMEOUT_STUN_MS;

    return new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        pc.removeEventListener("icecandidate", onCandidate);
        resolve();
      };

      const onStateChange = () => {
        if (pc.iceGatheringState === "complete") {
          finish();
        }
      };

      const onCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate === null) {
          finish();
        }
      };

      const timer = setTimeout(finish, timeoutMs);

      pc.addEventListener("icegatheringstatechange", onStateChange);
      pc.addEventListener("icecandidate", onCandidate);
    });
  }

  /**
   * Step 1 (Sender): Creates an RTCPeerConnection, opens the file-transfer RTCDataChannel,
   * generates an SDP Offer, waits for ICE gathering, and returns the CompactSDP offer payload.
   */
  public async createSenderOffer(options: {
    mode: SignalingMode;
    fileCount: number;
    totalBytes: number;
  }): Promise<CompactSDP> {
    this.setState("creating-offer");
    this.sessionId = generateSessionId();
    this.sessionToken = generateSecureToken(8);

    const pc = this.createPeerConnection(options.mode);
    const channel = pc.createDataChannel("droply-transfer", {
      ordered: true,
    });
    this.attachDataChannel(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.waitForIceGathering(pc, options.mode);

    const localDesc = pc.localDescription;
    if (!localDesc || !localDesc.sdp) {
      throw new Error("Failed to gather local WebRTC SDP offer.");
    }

    this.setState("awaiting-answer-scan");

    return {
      t: "o",
      sid: this.sessionId,
      tok: this.sessionToken,
      dev: getLocalDeviceLabel(),
      m: options.mode === "online-stun" ? 1 : 0,
      sdp: localDesc.sdp,
      ts: Math.floor(Date.now() / 1000),
      f: {
        c: options.fileCount,
        s: options.totalBytes,
      },
    };
  }

  /**
   * Step 2 (Receiver): Accepts the Sender's decoded Offer, validates session expiration,
   * sets the remote description, creates an SDP Answer, waits for ICE gathering, and returns the CompactSDP answer payload.
   */
  public async acceptOfferAndCreateAnswer(offerPayload: CompactSDP): Promise<CompactSDP> {
    if (offerPayload.t !== "o") {
      throw new Error("Scanned QR code is not a Sender Offer.");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (offerPayload.ts && Math.abs(nowSec - offerPayload.ts) > SESSION_EXPIRY_SECONDS) {
      throw new Error("This QR pairing session has expired. Please generate a fresh QR code on the sender.");
    }

    this.setState("processing-offer");
    this.sessionId = offerPayload.sid;
    this.sessionToken = offerPayload.tok;
    this.peerDeviceName = offerPayload.dev || "Sender Device";

    const mode: SignalingMode = offerPayload.m === 1 ? "online-stun" : "offline-local";
    const pc = this.createPeerConnection(mode);

    pc.ondatachannel = (event) => {
      this.attachDataChannel(event.channel);
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription({
        type: "offer",
        sdp: offerPayload.sdp,
      })
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.waitForIceGathering(pc, mode);

    const localDesc = pc.localDescription;
    if (!localDesc || !localDesc.sdp) {
      throw new Error("Failed to generate WebRTC SDP answer.");
    }

    this.setState("awaiting-peer-connection");
    this.startConnectionTimeout(CONNECTION_ESTABLISH_TIMEOUT_MS * 2);

    return {
      t: "a",
      sid: this.sessionId,
      tok: this.sessionToken,
      dev: getLocalDeviceLabel(),
      m: offerPayload.m,
      sdp: localDesc.sdp,
      ts: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Step 3 (Sender): Accepts the Receiver's decoded Answer, verifies session ID & security token,
   * sets the remote description, and initiates the direct WebRTC connection.
   */
  public async acceptReceiverAnswer(answerPayload: CompactSDP): Promise<void> {
    if (!this.pc) {
      throw new Error("No active Sender peer connection. Please start a new session.");
    }
    if (answerPayload.t !== "a") {
      throw new Error("Scanned QR code is not a Receiver Answer.");
    }
    if (answerPayload.sid !== this.sessionId || answerPayload.tok !== this.sessionToken) {
      throw new Error(
        "Session mismatch! This Answer QR belongs to a different pairing session."
      );
    }

    this.peerDeviceName = answerPayload.dev || "Receiver Device";
    this.setState("connecting");
    this.startConnectionTimeout(CONNECTION_ESTABLISH_TIMEOUT_MS);

    await this.pc.setRemoteDescription(
      new RTCSessionDescription({
        type: "answer",
        sdp: answerPayload.sdp,
      })
    );
  }

  /**
   * Inspects WebRTC candidate pair stats to confirm whether the active connection is
   * a direct local network path (host <-> host), STUN NAT traversal (srflx/prflx), or TURN relay.
   */
  private async inspectActiveRoute(): Promise<void> {
    if (!this.pc || typeof this.pc.getStats !== "function") return;
    try {
      const stats = await this.pc.getStats();
      let selectedLocalCandidateId: string | undefined;
      let selectedRemoteCandidateId: string | undefined;

      stats.forEach((report) => {
        if (report.type === "transport" && report.selectedCandidatePairId) {
          const pair = stats.get(report.selectedCandidatePairId);
          if (pair) {
            selectedLocalCandidateId = pair.localCandidateId;
            selectedRemoteCandidateId = pair.remoteCandidateId;
          }
        } else if (
          report.type === "candidate-pair" &&
          report.state === "succeeded" &&
          report.nominated
        ) {
          selectedLocalCandidateId = report.localCandidateId;
          selectedRemoteCandidateId = report.remoteCandidateId;
        }
      });

      if (selectedLocalCandidateId && selectedRemoteCandidateId) {
        const localCand = stats.get(selectedLocalCandidateId);
        const remoteCand = stats.get(selectedRemoteCandidateId);
        const localType = localCand?.candidateType;
        const remoteType = remoteCand?.candidateType;

        if (localType === "relay" || remoteType === "relay") {
          this.callbacks.onRouteDetected?.("relay-turn", `${localType} ↔ ${remoteType}`);
        } else if (localType === "host" && remoteType === "host") {
          this.callbacks.onRouteDetected?.("direct-lan", "Direct Local LAN / Hotspot (host ↔ host)");
        } else {
          this.callbacks.onRouteDetected?.(
            "stun-nat",
            `Direct P2P (${localType || "peer"} ↔ ${remoteType || "peer"})`
          );
        }
      } else {
        this.callbacks.onRouteDetected?.(
          this.signalingMode === "offline-local" ? "direct-lan" : "stun-nat",
          "Direct Peer-to-Peer"
        );
      }
    } catch {
      // Ignore stats error
    }
  }

  private startConnectionTimeout(ms: number): void {
    this.clearConnectionTimer();
    this.connectionTimer = setTimeout(() => {
      if (this.state !== "connected" && this.dc?.readyState !== "open") {
        this.setState("failed");
        this.callbacks.onError?.(
          "Connection timed out. Make sure both devices are connected to the same Wi-Fi network or mobile hotspot, and that client isolation or firewall rules are not blocking local WebRTC traffic."
        );
      }
    }, ms);
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private cleanupPeerConnection(): void {
    this.clearConnectionTimer();
    if (this.dc) {
      try {
        this.dc.onopen = null;
        this.dc.onclose = null;
        this.dc.onerror = null;
        this.dc.onmessage = null;
        this.dc.close();
      } catch {
        // Ignore close errors
      }
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.onconnectionstatechange = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.ondatachannel = null;
        this.pc.close();
      } catch {
        // Ignore close errors
      }
      this.pc = null;
    }
  }

  public destroy(): void {
    this.cleanupPeerConnection();
    this.setState("idle");
    this.callbacks.onDataChannelStateChange?.("closed");
  }
}

