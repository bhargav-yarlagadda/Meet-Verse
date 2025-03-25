import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from "cors";

const app = express();

// Enable CORS for frontend
app.use(cors({ origin: "http://localhost:3000", methods: ["GET", "POST"] }));

const server = createServer(app);

// Fix: Add CORS settings inside the `Server` instance
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",  // Allow frontend requests
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // Ensure WebSocket and polling work
});

const clients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  const avatarId = socket.id;
  clients.set(avatarId, socket);

  socket.emit('init', { avatarId });

  socket.on('position', (data) => {
    clients.forEach((client, id) => {
      if (id !== avatarId) {
        client.emit('position', { avatarId, x: data.x, y: data.y });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', avatarId);
    clients.delete(avatarId);
    io.emit('remove', { avatarId });
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
