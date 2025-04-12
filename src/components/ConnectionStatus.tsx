import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { PeerConnection } from '../types';

interface ConnectionStatusProps {
  peer: PeerConnection | null;
}

export function ConnectionStatus({ peer }: ConnectionStatusProps) {
  if (!peer) {
    return (
      <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full">
        <WifiOff className="w-5 h-5 text-gray-500" />
        <span className="text-gray-700 font-medium">Not connected</span>
      </div>
    );
  }

  if (!peer.connected) {
    return (
      <div className="flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full">
        <WifiOff className="w-5 h-5 text-yellow-600" />
        <span className="text-yellow-700 font-medium">Connection lost</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
      <Wifi className="w-5 h-5 text-green-600" />
      <span className="text-green-700 font-medium">
        {peer.initiator ? 'Connected to host' : 'Connected to peer'}
      </span>
    </div>
  );
}