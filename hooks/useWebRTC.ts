"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  CompactSDP,
  DataChannelState,
  PeerRole,
  QRFrame,
  RouteType,
  SignalingMode,
  WebRTCConnectionState,
} from "@/lib/types";
import { WebRTCPeerManager } from "@/lib/webrtc/peer-manager";
import { encodeSDPToQRFrames } from "@/lib/signaling/sdp-compact";

export interface UseWebRTCOptions {
  onDataChannelOpen?: (
    channel: RTCDataChannel,
    meta: { sessionId: string; sessionToken: string; role: PeerRole; peerName: string }
  ) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const [role, setRole] = useState<PeerRole>("idle");
  const [signalingMode, setSignalingMode] = useState<SignalingMode>("offline-local");
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>("idle");
  const [dataChannelState, setDataChannelState] = useState<DataChannelState>("closed");
  const [routeType, setRouteType] = useState<RouteType>("unknown");
  const [routeDetails, setRouteDetails] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [peerDeviceName, setPeerDeviceName] = useState<string>("Remote Peer");
  const [sessionId, setSessionId] = useState<string>("");
  const [offerPreview, setOfferPreview] = useState<{
    fileCount: number;
    totalBytes: number;
  } | null>(null);

  const [qrPayload, setQrPayload] = useState<CompactSDP | null>(null);
  const [forceMultiFrame, setForceMultiFrame] = useState<boolean>(false);

  const managerRef = useRef<WebRTCPeerManager | null>(null);
  const roleRef = useRef<PeerRole>("idle");
  const onOpenRef = useRef(options.onDataChannelOpen);

  useEffect(() => {
    onOpenRef.current = options.onDataChannelOpen;
  }, [options.onDataChannelOpen]);

  const { qrFrames, compactCode } = useMemo(() => {
    if (!qrPayload) {
      return { qrFrames: [] as QRFrame[], compactCode: "" };
    }
    const encoded = encodeSDPToQRFrames(qrPayload, {
      forceMultiFrame,
    });
    return {
      qrFrames: encoded.frames,
      compactCode: encoded.compactCode,
    };
  }, [qrPayload, forceMultiFrame]);

  const ensureManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new WebRTCPeerManager({
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        },
        onDataChannelStateChange: (dcState) => {
          setDataChannelState(dcState);
        },
        onRouteDetected: (route, details) => {
          setRouteType(route);
          if (details) setRouteDetails(details);
        },
        onError: (msg) => {
          setError(msg);
        },
        onDataChannelReady: (channel) => {
          const mgr = managerRef.current;
          if (!mgr) return;
          setPeerDeviceName(mgr.getPeerDeviceName());
          onOpenRef.current?.(channel, {
            sessionId: mgr.getSessionId(),
            sessionToken: mgr.getSessionToken(),
            role: roleRef.current,
            peerName: mgr.getPeerDeviceName(),
          });
        },
      });
    }
    return managerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  const startSenderSession = useCallback(
    async (fileCount: number, totalBytes: number, mode?: SignalingMode) => {
      setError(null);
      const activeMode = mode || signalingMode;
      roleRef.current = "sender";
      setRole("sender");

      try {
        const mgr = ensureManager();
        const offer = await mgr.createSenderOffer({
          mode: activeMode,
          fileCount,
          totalBytes,
        });
        setSessionId(offer.sid);
        setQrPayload(offer);
        return offer;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create WebRTC offer.";
        setError(msg);
        throw err;
      }
    },
    [ensureManager, signalingMode]
  );

  const handleOfferScannedByReceiver = useCallback(
    async (offerPayload: CompactSDP) => {
      setError(null);
      roleRef.current = "receiver";
      setRole("receiver");

      try {
        const mgr = ensureManager();
        if (offerPayload.f) {
          setOfferPreview({
            fileCount: offerPayload.f.c,
            totalBytes: offerPayload.f.s,
          });
        }
        const answer = await mgr.acceptOfferAndCreateAnswer(offerPayload);
        setSessionId(answer.sid);
        setPeerDeviceName(mgr.getPeerDeviceName());
        setQrPayload(answer);
        return answer;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to process Sender Offer QR.";
        setError(msg);
        throw err;
      }
    },
    [ensureManager]
  );

  const handleAnswerScannedBySender = useCallback(
    async (answerPayload: CompactSDP) => {
      setError(null);
      try {
        const mgr = ensureManager();
        await mgr.acceptReceiverAnswer(answerPayload);
        setPeerDeviceName(mgr.getPeerDeviceName());
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to apply Receiver Answer QR.";
        setError(msg);
        throw err;
      }
    },
    [ensureManager]
  );

  const resetSession = useCallback(() => {
    managerRef.current?.destroy();
    roleRef.current = "idle";
    setRole("idle");
    setConnectionState("idle");
    setDataChannelState("closed");
    setRouteType("unknown");
    setRouteDetails("");
    setError(null);
    setQrPayload(null);
    setSessionId("");
    setOfferPreview(null);
  }, []);

  return {
    role,
    signalingMode,
    setSignalingMode,
    connectionState,
    dataChannelState,
    routeType,
    routeDetails,
    error,
    setError,
    peerDeviceName,
    sessionId,
    offerPreview,
    qrFrames,
    compactCode,
    forceMultiFrame,
    setForceMultiFrame,
    startSenderSession,
    handleOfferScannedByReceiver,
    handleAnswerScannedBySender,
    resetSession,
  };
}

