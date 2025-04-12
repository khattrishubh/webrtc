import { PeerServer } from 'peer';

try {
  const server = PeerServer({
    port: 9000,
    path: '/myapp',
    allow_discovery: true,
    proxied: true,
    corsOptions: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  server.on('connection', (client) => {
    console.log('Client connected:', client.getId());
  });

  server.on('disconnect', (client) => {
    console.log('Client disconnected:', client.getId());
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  console.log('PeerJS server running on port 9000');
} catch (error) {
  console.error('Failed to start PeerJS server:', error);
  process.exit(1);
} 