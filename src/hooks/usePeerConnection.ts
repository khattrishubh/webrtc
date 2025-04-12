import { useState, useEffect, useCallback } from 'react';
import Peer from 'peerjs';
import { PeerConnection, JoinRequest, FileTransfer } from '../types';

interface UsePeerConnectionProps {
  onPeerConnection: (connection: PeerConnection) => void;
  onJoinRequest?: (request: JoinRequest) => void;
  onFileTransferProgress?: (transfer: FileTransfer) => void;
}

export function usePeerConnection({ 
  onPeerConnection, 
  onJoinRequest,
  onFileTransferProgress 
}: UsePeerConnectionProps) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ [key: string]: any }>({});

  const sendFileChunk = useCallback((conn: any, file: File, chunkSize: number = 16384) => {
    let offset = 0;
    const fileId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / chunkSize);
    let chunkIndex = 0;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && offset < file.size) {
        // Send chunk info
        conn.send({
          type: 'file_chunk',
          data: {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            chunk: reader.result,
            chunkIndex,
            totalChunks,
          },
        });

        // Update progress
        const progress = Math.min((offset / file.size) * 100, 100);
        if (onFileTransferProgress) {
          onFileTransferProgress({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            progress,
            status: progress === 100 ? 'completed' : 'transferring',
          });
        }

        // Read next chunk
        offset += chunkSize;
        chunkIndex++;
        if (offset < file.size) {
          const slice = file.slice(offset, offset + chunkSize);
          reader.readAsArrayBuffer(slice);
        }
      }
    };

    // Start reading first chunk
    const firstSlice = file.slice(0, chunkSize);
    reader.readAsArrayBuffer(firstSlice);
  }, [onFileTransferProgress]);

  const handleFileTransfer = useCallback((files: FileList) => {
    Object.values(connections).forEach((conn: any) => {
      Array.from(files).forEach((file) => {
        sendFileChunk(conn, file);
      });
    });
  }, [connections, sendFileChunk]);

  const handleFileChunks = useCallback((fileChunks: { [key: string]: { 
    chunks: ArrayBuffer[],
    received: number,
    total: number,
    meta: any
  } }, id: string) => {
    const { chunks, meta } = fileChunks[id];
    // Combine chunks into a single ArrayBuffer
    const combinedChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + (chunk as ArrayBuffer).byteLength, 0));
    let offset = 0;
    chunks.forEach(chunk => {
      combinedChunks.set(new Uint8Array(chunk as ArrayBuffer), offset);
      offset += (chunk as ArrayBuffer).byteLength;
    });

    if (onFileTransferProgress) {
      onFileTransferProgress({
        id,
        ...meta,
        progress: 100,
        status: 'completed',
        fileData: combinedChunks.buffer,
      });
    }
  }, [onFileTransferProgress]);

  useEffect(() => {
    const newPeer = new Peer({
      host: 'localhost',
      port: 9000,
      path: '/myapp',
      debug: 3,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    newPeer.on('open', (id) => {
      console.log('My peer ID is:', id);
      setPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      onPeerConnection({
        id: '',
        connected: false,
        initiator: false,
      });
    });

    newPeer.on('disconnected', () => {
      console.log('Peer disconnected. Attempting to reconnect...');
      newPeer.reconnect();
    });

    newPeer.on('close', () => {
      console.log('Peer connection closed');
      setPeer(null);
      setPeerId(null);
      setConnections({});
    });

    newPeer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      
      // Store the connection
      setConnections(prev => ({ ...prev, [conn.peer]: conn }));
      
      conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        onPeerConnection({
          id: conn.peer,
          connected: true,
          initiator: false,
        });

        // Send a ping every 5 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          try {
            conn.send({ type: 'ping' });
          } catch (err) {
            console.error('Failed to send ping:', err);
            clearInterval(pingInterval);
          }
        }, 5000);

        // Clean up interval when connection closes
        conn.on('close', () => {
          clearInterval(pingInterval);
        });
      });

      const fileChunks: { [key: string]: { 
        chunks: ArrayBuffer[],
        received: number,
        total: number,
        meta: any
      } } = {};

      conn.on('data', (data: any) => {
        console.log('Received data type:', data.type);
        
        if (data.type === 'join_request') {
          onJoinRequest?.(data.data);
        } 
        else if (data.type === 'file_chunk') {
          const { id, chunk, chunkIndex, totalChunks, ...meta } = data.data;
          
          // Initialize file transfer if it's the first chunk
          if (!fileChunks[id]) {
            fileChunks[id] = {
              chunks: new Array(totalChunks),
              received: 0,
              total: totalChunks,
              meta
            };
          }

          // Store the chunk
          fileChunks[id].chunks[chunkIndex] = chunk;
          fileChunks[id].received++;

          // Calculate progress
          const progress = (fileChunks[id].received / fileChunks[id].total) * 100;
          
          if (onFileTransferProgress) {
            onFileTransferProgress({
              id,
              ...meta,
              progress,
              status: 'transferring',
            });
          }

          // If all chunks received, combine and create file
          if (fileChunks[id].received === fileChunks[id].total) {
            handleFileChunks(fileChunks, id);
            delete fileChunks[id];
          }
        }
      });

      conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        onPeerConnection({
          id: conn.peer,
          connected: false,
          initiator: false,
        });
        setConnections(prev => {
          const newConns = { ...prev };
          delete newConns[conn.peer];
          return newConns;
        });
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        onPeerConnection({
          id: conn.peer,
          connected: false,
          initiator: false,
        });
        setConnections(prev => {
          const newConns = { ...prev };
          delete newConns[conn.peer];
          return newConns;
        });
      });
    });

    return () => {
      Object.values(connections).forEach((conn: any) => {
        conn.close();
      });
      newPeer.destroy();
    };
  }, [onPeerConnection, onJoinRequest, onFileTransferProgress, handleFileChunks]);

  const createRoom = useCallback(() => {
    if (!peer || !peerId) return null;
    return peerId;
  }, [peer, peerId]);

  const joinRoom = useCallback((roomCode: string, username: string) => {
    if (!peer) return;

    console.log('Attempting to join room:', roomCode);
    const conn = peer.connect(roomCode, {
      reliable: true,
      metadata: { username }
    });
    
    // Store the connection
    setConnections(prev => ({ ...prev, [conn.peer]: conn }));
    
    conn.on('open', () => {
      console.log('Successfully connected to host');
      onPeerConnection({
        id: conn.peer,
        connected: true,
        initiator: true,
      });

      // Send join request through the connection
      if (onJoinRequest) {
        const request: JoinRequest = {
          id: crypto.randomUUID(),
          username,
          timestamp: new Date(),
        };
        conn.send({ type: 'join_request', data: request });
        onJoinRequest(request);
      }

      // Set up ping interval
      const pingInterval = setInterval(() => {
        try {
          conn.send({ type: 'ping' });
        } catch (err) {
          console.error('Failed to send ping:', err);
          clearInterval(pingInterval);
        }
      }, 5000);

      // Clean up interval when connection closes
      conn.on('close', () => {
        clearInterval(pingInterval);
      });
    });

    const fileChunks: { [key: string]: { 
      chunks: ArrayBuffer[],
      received: number,
      total: number,
      meta: any
    } } = {};

    conn.on('data', (data: any) => {
      console.log('Received data type:', data.type);
      
      if (data.type === 'file_chunk') {
        const { id, chunk, chunkIndex, totalChunks, ...meta } = data.data;
        
        // Initialize file transfer if it's the first chunk
        if (!fileChunks[id]) {
          fileChunks[id] = {
            chunks: new Array(totalChunks),
            received: 0,
            total: totalChunks,
            meta
          };
        }

        // Store the chunk
        fileChunks[id].chunks[chunkIndex] = chunk;
        fileChunks[id].received++;

        // Calculate progress
        const progress = (fileChunks[id].received / fileChunks[id].total) * 100;
        
        if (onFileTransferProgress) {
          onFileTransferProgress({
            id,
            ...meta,
            progress,
            status: 'transferring',
          });
        }

        // If all chunks received, combine and create file
        if (fileChunks[id].received === fileChunks[id].total) {
          handleFileChunks(fileChunks, id);
          delete fileChunks[id];
        }
      }
    });

    conn.on('close', () => {
      console.log('Connection to host closed');
      onPeerConnection({
        id: conn.peer,
        connected: false,
        initiator: true,
      });
      setConnections(prev => {
        const newConns = { ...prev };
        delete newConns[conn.peer];
        return newConns;
      });
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      onPeerConnection({
        id: conn.peer,
        connected: false,
        initiator: true,
      });
      setConnections(prev => {
        const newConns = { ...prev };
        delete newConns[conn.peer];
        return newConns;
      });
    });
  }, [peer, onJoinRequest, onPeerConnection, onFileTransferProgress, handleFileChunks]);

  return {
    peer,
    peerId,
    createRoom,
    joinRoom,
    handleFileTransfer,
  };
} 