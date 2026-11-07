# LetsShare – Offline QR-Based Peer-to-Peer File Sharing PWA

**Share files. No internet. No uploads.**

Droply is an offline-first Progressive Web App (PWA) built with Next.js (App Router), TypeScript, Tailwind CSS, and native WebRTC DataChannels. It transfers files directly between devices over a shared Wi-Fi network or mobile hotspot using two-way QR code signaling — with zero cloud uploads, zero accounts, and zero external signaling servers.

---

## Key Features

- **Out-of-Band QR WebRTC Signaling**:
  - Replaces online WebSocket signaling servers with a 2-step QR exchange (**Sender Offer QR → Receiver Answer QR**).
  - Minifies SDP attributes and compresses payloads with Deflate (`fflate`) + Base64URL.
  - Supports both **Single QR** mode and **Easy Scan Multi-QR (Animated Frame Fragmentation)** with CRC32 checksums for large SDP descriptions or lower-resolution cameras, plus QR PNG upload and Pairing Code copy/paste fallbacks.
- **Internet-Free Local Wi-Fi & Mobile Hotspot Support**:
  - In **Offline LAN / Hotspot Mode**, `RTCPeerConnection` is configured with `iceServers: []` so host candidates are gathered directly from local network interfaces without waiting on external STUN/TURN servers.
  - Includes an optional **Online STUN Mode** (`stun:stun.l.google.com:19302`) for cross-subnet discovery when internet is available.
- **Chunked File Transfer Engine (`64 KB` Chunks + Backpressure)**:
  - Streams large files lazily via `Blob.slice()` in 64 KB binary frames (`[fileIndex:4B][chunkIndex:4B][payload]`) over `RTCDataChannel`.
  - Monitors `bufferedAmount` and `bufferedAmountLowThreshold` to prevent memory spikes or buffer overflows.
  - Supports multiple files in a queue, real-time speed (`MB/s`), ETA, pause/resume from chunk offsets, cancel, and retry.
- **End-to-End Security & SHA-256 Verification**:
  - Explicit Receiver acceptance required before any file bytes are transmitted.
  - Strips local filesystem paths and validates all incoming file metadata.
  - Computes and verifies incremental **SHA-256** checksums (`crypto.subtle.digest` + streaming SHA-256 engine for multi-hundred-MB/GB files).
- **Installable Offline PWA**:
  - Custom Service Worker (`public/sw.js`) and Web App Manifest (`public/manifest.json`) cache the application shell (`/`, `/send`, `/receive`, `/setup`, `/transfer`) and static bundles for offline startup.

---

## Project Architecture

```text
letsshare/
├── app/
│   ├── layout.tsx          # Root layout, PWA metadata, DroplySessionProvider
│   ├── page.tsx            # Main Dashboard & Network Telemetry
│   ├── send/page.tsx       # Sender workflow (File Picker -> Offer QR -> Scan Answer -> Stream)
│   ├── receive/page.tsx    # Receiver workflow (Scan Offer -> Answer QR -> Accept -> Save)
│   ├── setup/page.tsx      # Interactive 5-Step Hotspot Setup Wizard (Android, iOS, Windows)
│   └── transfer/page.tsx   # Active Transfer Monitor & SHA-256 Verification Report
├── components/
│   ├── files/              # Drag-and-drop FilePicker & category icons
│   ├── layout/             # Navbar (PWA install, theme toggle, status) & Privacy Footer
│   ├── network/            # NetworkStatusBar & ICE Mode switcher
│   ├── qr/                 # QRDisplay (single & multi-frame) & QRScanner (camera/image/code)
│   ├── transfer/           # TransferPanel (Accept/Decline prompt, progress, SHA-256 status)
│   └── ui/                 # Reusable Button, Card, Badge, Progress components
├── hooks/
│   ├── useDroplySession.tsx
│   ├── useFileTransfer.ts
│   ├── useNetworkStatus.ts
│   ├── useQRScanner.ts
│   └── useWebRTC.ts
├── lib/
│   ├── file/format.ts      # Byte/duration formatting & MIME classification
│   ├── offline/            # IndexedDB session storage & Service Worker registration
│   ├── qr/qr-service.ts    # QR PNG generation & image decoding
│   ├── security/crypto.ts  # Incremental SHA-256, token generation & filename sanitization
│   ├── signaling/          # SDP compaction, Deflate compression & multi-QR framing
│   ├── transfer/           # 64 KB chunked WebRTC DataChannel transfer engine
│   ├── types/index.ts      # Core TypeScript interfaces
│   └── webrtc/             # RTCPeerConnection & RTCDataChannel lifecycle manager
└── public/
    ├── icons/              # 192x192, 512x512, maskable PNG & SVG PWA icons
    ├── manifest.json       # Web App Manifest
    └── sw.js               # Offline-first Service Worker
```

---

## Getting Started

```bash
cd letsshare
npm install
npm run dev
```

For production offline PWA caching:

```bash
npm run build
npm run start
```
