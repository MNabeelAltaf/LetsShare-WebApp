"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useFileTransfer } from "@/hooks/useFileTransfer";

type DroplySessionContextValue = ReturnType<typeof useNetworkStatus> &
  ReturnType<typeof useWebRTC> &
  ReturnType<typeof useFileTransfer> & {
    terminateEntireSession: () => void;
  };

const DroplySessionContext = createContext<DroplySessionContextValue | null>(
  null
);

export function DroplySessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const network = useNetworkStatus();
  const transfer = useFileTransfer();

  const selectedFilesRef = useRef(transfer.selectedFiles);
  useEffect(() => {
    selectedFilesRef.current = transfer.selectedFiles;
  }, [transfer.selectedFiles]);

  const webrtc = useWebRTC({
    onDataChannelOpen: (channel, meta) => {
      void transfer.bindDataChannelAndStart(
        channel,
        meta,
        selectedFilesRef.current
      );
    },
  });

  const terminateEntireSession = useCallback(() => {
    webrtc.resetSession();
    transfer.resetTransferState();
  }, [webrtc, transfer]);

  const value: DroplySessionContextValue = {
    ...network,
    ...webrtc,
    ...transfer,
    terminateEntireSession,
  };

  return (
    <DroplySessionContext.Provider value={value}>
      {children}
    </DroplySessionContext.Provider>
  );
}

export function useDroplySession(): DroplySessionContextValue {
  const ctx = useContext(DroplySessionContext);
  if (!ctx) {
    throw new Error(
      "useDroplySession must be used inside <DroplySessionProvider>"
    );
  }
  return ctx;
}

