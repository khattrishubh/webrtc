# P2P File Share

> Secure, serverless peer-to-peer file transfer powered by WebRTC.

No cloud storage. No file size limits imposed by a server. Files travel directly between browsers using end-to-end encrypted WebRTC data channels — the signaling server is only used to establish the initial connection.

---

## Features

- **Create or Join Rooms** — Generate a room code and share it, or enter an existing code to join
- **QR Code Sharing** — Display a scannable QR code to share the room URL instantly
- **Copy Invite Link** — One-click copy of the shareable room URL (includes room code as a query param)
- **Real-time File Transfer** — Files are chunked (16 KB chunks) and streamed directly over a WebRTC data channel
- **Live Progress Tracking** — Per-file progress bars update in real time as chunks arrive
- **Join Request Approval** — Room owners see pending join requests and can accept or reject them
- **Auto-reconnect** — The PeerJS client automatically attempts to reconnect on dropped connections
- **Keepalive Pings** — A ping is sent every 5 seconds on each connection to prevent idle timeouts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| P2P / WebRTC | PeerJS 1.5 |
| Signaling server | `peer` npm package (PeerServer) |
| QR codes | `qrcode.react` |
| Icons | `lucide-react` |
| Dev orchestration | `concurrently` |

---

## Project Structure

```
webrtc/
├── server.js                  # PeerJS signaling server (port 9000)
├── index.html                 # Vite HTML entry point
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Root component — state, room & transfer orchestration
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── index.css
│   ├── hooks/
│   │   └── usePeerConnection.ts   # Core WebRTC hook (peer lifecycle, chunked transfer)
│   └── components/
│       ├── RoomManager.tsx    # Create room / Join room UI, QR code, pending requests
│       ├── FileUpload.tsx     # Drag-and-drop / click file picker
│       ├── TransferList.tsx   # List of active transfers with progress
│       └── ConnectionStatus.tsx   # Header connection indicator
└── backend/
    └── package.json           # Standalone backend deps (express, cors, peer)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install & Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start both the signaling server and Vite dev server
npm start
```

This uses `concurrently` to run two processes in parallel:

| Process | Command | URL |
|---|---|---|
| Vite dev server | `npm run dev` | http://localhost:5173 |
| PeerJS signaling server | `npm run server` | http://localhost:9000/myapp |

> **Why `--legacy-peer-deps`?** The project pins `@typescript-eslint/parser@7` which declares a peer dep on `eslint@^8`, while the project uses `eslint@9`. The flag bypasses this conflict safely for local development.

### Individual Scripts

```bash
npm run dev       # Frontend only (Vite)
npm run server    # Signaling server only (PeerJS)
npm run build     # Production build (tsc + vite build)
npm run preview   # Preview the production build
npm run lint      # ESLint
npm run typecheck # TypeScript type check (no emit)
```

---

## How It Works

```
User A (Host)                      PeerJS Server                    User B (Guest)
     |                              (port 9000)                           |
     |--- newPeer() --------------->|                                     |
     |<-- peerId assigned ----------|                                     |
     |                              |<--- newPeer() -----------------------|
     |                              |---- peerId assigned ---------------->|
     |                              |                                     |
     |    Host shares peerId (room code) out-of-band (link / QR)        |
     |                              |                                     |
     |                              |<--- peer.connect(hostPeerId) --------|
     |<-- signaling exchange ------->|<--- signaling exchange -------------|
     |                              |                                     |
     |<=========== Direct WebRTC Data Channel (no server) =============>|
     |                                                                    |
     |--- file chunks (16 KB each, ArrayBuffer) ------------------------>|
     |<-- progress events (chunkIndex / totalChunks) -------------------|
     |                        ... all chunks received ...                |
     |                    reassemble → Blob → auto-download              |
```

1. Both peers register with the local PeerJS signaling server on startup.
2. The host's **Peer ID is the room code** — no separate room registry needed.
3. The guest calls `peer.connect(roomCode)` which triggers WebRTC negotiation through the signaling server.
4. Once the data channel is open, all subsequent communication (file chunks, pings, join requests) flows **directly peer-to-peer**.
5. Files are split into 16 KB `ArrayBuffer` chunks, sent in order, reassembled on the receiver side, and offered as a browser download.

---

## Configuration

### Signaling Server (`server.js`)

| Option | Value | Description |
|---|---|---|
| `port` | `9000` | Port the PeerServer listens on |
| `path` | `/myapp` | URL path prefix |
| `allow_discovery` | `true` | Allows peers to list connected peers |
| `proxied` | `true` | Trust X-Forwarded-* headers (for reverse proxy) |

### ICE / STUN Servers (`usePeerConnection.ts`)

```ts
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
]
```

Both are free public STUN servers. For production or NAT-heavy environments, add TURN server credentials here.

---

## Key Data Types

```ts
interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;                              // 0–100
  status: 'waiting' | 'transferring' | 'completed' | 'error';
  fileData?: ArrayBuffer;                        // populated on receiver side
}

interface PeerConnection {
  id: string;       // remote peer ID
  connected: boolean;
  initiator: boolean;   // true if this peer created the connection
}

interface JoinRequest {
  id: string;
  username: string;
  timestamp: Date;
}
```

---

## Wire Protocol

Messages sent over the WebRTC data channel are plain JS objects:

| `type` | Direction | Payload |
|---|---|---|
| `file_chunk` | sender → receiver | `{ id, name, size, type, chunk: ArrayBuffer, chunkIndex, totalChunks }` |
| `join_request` | guest → host | `{ id, username, timestamp }` |
| `ping` | both directions | _(no payload)_ |

---

## Known Limitations & TODOs

- **Join request approval is UI-only** — accepting/rejecting a request does not yet send a message back to the guest peer (marked `// TODO` in `App.tsx`).
- **Local signaling only** — the PeerServer runs on `localhost:9000`. To share across devices on the same network, expose the server with `--host` in Vite and update the `host` in `usePeerConnection.ts`.
- **No TURN server** — connections may fail in strict NAT environments (e.g., corporate networks) without a TURN relay.
- **Single-room per session** — each browser tab supports one active room at a time.
- **No file size chunking resume** — if the connection drops mid-transfer, the transfer must restart from the beginning.

---

## License

MIT
