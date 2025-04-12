import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { TransferList } from './components/TransferList';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RoomManager } from './components/RoomManager';
import { FileTransfer, PeerConnection, JoinRequest } from './types';
import { Share2, Shield, Zap } from 'lucide-react';
import { usePeerConnection } from './hooks/usePeerConnection';

function App() {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [peer, setPeer] = useState<PeerConnection | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | undefined>();
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handlePeerConnection = useCallback((connection: PeerConnection) => {
    setPeer(connection);
    setIsConnecting(false);
    setError(undefined);
  }, []);

  const handleJoinRequest = useCallback((request: JoinRequest) => {
    setPendingRequests(prev => [...prev, request]);
  }, []);

  const handleFileTransferProgress = useCallback((transfer: FileTransfer) => {
    setTransfers(prev => {
      const existing = prev.find(t => t.id === transfer.id);
      if (existing) {
        return prev.map(t => t.id === transfer.id ? transfer : t);
      }
      return [...prev, transfer];
    });
  }, []);

  const { createRoom: createPeerRoom, joinRoom: joinPeerRoom, handleFileTransfer } = usePeerConnection({
    onPeerConnection: handlePeerConnection,
    onJoinRequest: handleJoinRequest,
    onFileTransferProgress: handleFileTransferProgress,
  });

  const handleFileSelect = useCallback((files: FileList) => {
    if (!peer?.connected) {
      setError('Cannot transfer files: No peer connection');
      return;
    }

    const newTransfers: FileTransfer[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'waiting',
    }));

    setTransfers((prev) => [...prev, ...newTransfers]);
    handleFileTransfer(files);
  }, [peer, handleFileTransfer]);

  const handleCreateRoom = useCallback(() => {
    setIsConnecting(true);
    setError(undefined);
    try {
      const roomCode = createPeerRoom();
      if (roomCode) {
        setCurrentRoom(roomCode);
        setIsRoomOwner(true);
      } else {
        setError('Failed to create room. Please try again.');
        setIsConnecting(false);
      }
    } catch (err) {
      setError('Failed to create room. Please try again.');
      setIsConnecting(false);
    }
  }, [createPeerRoom]);

  const handleJoinRoom = useCallback((code: string, username: string) => {
    setIsConnecting(true);
    setError(undefined);
    try {
      joinPeerRoom(code, username);
      setCurrentRoom(code);
      setIsRoomOwner(false);
    } catch (err) {
      setError('Failed to join room. Please check the room code and try again.');
      setIsConnecting(false);
    }
  }, [joinPeerRoom]);

  const handleApproveRequest = useCallback((requestId: string) => {
    setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    // TODO: Send approval to peer
  }, []);

  const handleRejectRequest = useCallback((requestId: string) => {
    setPendingRequests((prev) => prev.filter((req) => req.id !== requestId));
    // TODO: Send rejection to peer
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      setCurrentRoom(roomCode);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 p-2 rounded-lg shadow-md">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  P2P File Share
                </h1>
                <p className="text-sm text-gray-500">Secure file transfer made easy</p>
              </div>
            </div>
            <ConnectionStatus peer={peer} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-12">
          <div className="text-center max-w-2xl">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Secure P2P File Sharing
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Share files directly with end-to-end encryption
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-600">Direct peer-to-peer transfer for maximum speed</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure</h3>
                <p className="text-gray-600">End-to-end encrypted file transfer</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Easy Sharing</h3>
                <p className="text-gray-600">Share rooms via QR code or link</p>
              </div>
            </div>
          </div>

          <RoomManager
            currentRoom={currentRoom}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isOwner={isRoomOwner}
            pendingRequests={isRoomOwner ? pendingRequests : undefined}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            isConnecting={isConnecting}
            error={error}
          />

          {currentRoom && peer?.connected && (
            <div className="w-full max-w-4xl animate-fade-in">
              <FileUpload onFileSelect={handleFileSelect} />
            </div>
          )}

          {transfers.length > 0 && currentRoom && (
            <div className="w-full max-w-4xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Active Transfers
              </h3>
              <TransferList transfers={transfers} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Files are transferred directly between peers using WebRTC
            </p>
            <p className="text-gray-400 text-sm mt-2">
              No server storage. No limits. Just secure sharing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;