import React, { useState } from 'react';
import { KeyRound, Users, Link as LinkIcon, QrCode, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { JoinRequest } from '../types';

interface RoomManagerProps {
  onJoinRoom: (code: string, username: string) => void;
  onCreateRoom: () => void;
  currentRoom?: string;
  isOwner?: boolean;
  pendingRequests?: JoinRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  isConnecting?: boolean;
  error?: string;
}

export function RoomManager({
  onJoinRoom,
  onCreateRoom,
  currentRoom,
  isOwner,
  pendingRequests = [],
  onApproveRequest,
  onRejectRequest,
  isConnecting = false,
  error,
}: RoomManagerProps) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [showQR, setShowQR] = useState(false);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && username.trim()) {
      onJoinRoom(roomCode.trim(), username.trim());
      setRoomCode('');
      setUsername('');
    }
  };

  const roomUrl = currentRoom
    ? `${window.location.origin}?room=${currentRoom}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
  };

  if (currentRoom) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-blue-700">Room: {currentRoom}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={copyLink}
                className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                title="Copy invite link"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                title="Show QR code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>
          {showQR && (
            <div className="mt-4 flex justify-center">
              <QRCodeSVG value={roomUrl} size={200} />
            </div>
          )}
        </div>

        {isOwner && pendingRequests.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Pending Join Requests
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {request.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onApproveRequest?.(request.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onRejectRequest?.(request.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          <button
            onClick={onCreateRoom}
            disabled={isConnecting}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Users className="w-5 h-5" />
            )}
            <span>{isConnecting ? 'Creating Room...' : 'Create New Room'}</span>
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or join existing</span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                disabled={isConnecting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Enter room code"
                    disabled={isConnecting}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <button
                  type="submit"
                  disabled={!roomCode.trim() || !username.trim() || isConnecting}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:bg-gray-300 flex items-center space-x-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <span>Request Join</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}