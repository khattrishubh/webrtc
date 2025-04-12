export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'waiting' | 'transferring' | 'completed' | 'error';
  fileData?: ArrayBuffer;
}

export interface PeerConnection {
  id: string;
  connected: boolean;
  initiator: boolean;
}

export interface Room {
  id: string;
  code: string;
  createdAt: Date;
  participants: number;
  pendingRequests: JoinRequest[];
}

export interface JoinRequest {
  id: string;
  username: string;
  timestamp: Date;
}