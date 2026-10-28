import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load backend/.env as well as root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import meetingsRouter from './routes/meetings.js';
import faceRouter from './routes/face.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Normalize allowed origins for CORS
const rawClientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
const allowedOrigins = rawClientUrl && rawClientUrl !== '*'
  ? [rawClientUrl.replace(/\/$/, ''), 'http://localhost:5173', 'http://localhost:3000']
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Support up to 25mb for face image enrollment payloads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// In-memory room and user storage for active WebRTC session state
// roomId -> Map(socketId -> { socketId, userName, isVideoOn, isAudioOn })
const rooms = new Map();
// socketId -> roomId
const socketToRoom = new Map();

// Initialize Neon Database schema
initDb();

// Authentication, Meeting, and Face Recognition Routes
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/face', faceRouter);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Neon PostgreSQL (Connected)',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Helper to remove user from active room
  const handleLeaveRoom = () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    socketToRoom.delete(socket.id);
    const roomUsers = rooms.get(roomId);

    if (roomUsers) {
      const user = roomUsers.get(socket.id);
      roomUsers.delete(socket.id);

      console.log(`[User Left] ${user?.userName || socket.id} left room "${roomId}". Remaining: ${roomUsers.size}`);

      // Notify others in room
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        userName: user?.userName || 'A participant'
      });

      // Clean up empty room
      if (roomUsers.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room Deleted] Room "${roomId}" is now empty and removed.`);
      }
    }

    socket.leave(roomId);
  };

  // Join Meeting
  socket.on('join-meeting', ({ roomId, userName, isVideoOn = true, isAudioOn = true }) => {
    if (!roomId || !userName) {
      socket.emit('error-message', { message: 'Room ID and User Name are required.' });
      return;
    }

    // Leave any existing room first
    handleLeaveRoom();

    const normalizedRoomId = roomId.trim().toLowerCase();
    const cleanUserName = userName.trim();

    if (!rooms.has(normalizedRoomId)) {
      rooms.set(normalizedRoomId, new Map());
    }

    const roomUsers = rooms.get(normalizedRoomId);
    const userInfo = {
      socketId: socket.id,
      userName: cleanUserName,
      isVideoOn: Boolean(isVideoOn),
      isAudioOn: Boolean(isAudioOn)
    };

    // Existing participants currently in the room
    const existingParticipants = Array.from(roomUsers.values());

    // Add current user
    roomUsers.set(socket.id, userInfo);
    socketToRoom.set(socket.id, normalizedRoomId);
    socket.join(normalizedRoomId);

    console.log(`[User Joined] ${cleanUserName} (${socket.id}) joined room "${normalizedRoomId}". Total: ${roomUsers.size}`);

    // Send joining user the list of existing participants
    socket.emit('meeting-joined', {
      roomId: normalizedRoomId,
      self: userInfo,
      participants: existingParticipants
    });

    // Notify other peers in room about new participant
    socket.to(normalizedRoomId).emit('user-joined', userInfo);
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('signal-offer', {
      callerSocketId: socket.id,
      offer
    });
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('signal-answer', {
      responderSocketId: socket.id,
      answer
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Toggle Video State
  socket.on('toggle-video', ({ isVideoOn }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const roomUsers = rooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.id)) {
      const user = roomUsers.get(socket.id);
      user.isVideoOn = isVideoOn;
      socket.to(roomId).emit('user-video-toggled', {
        socketId: socket.id,
        isVideoOn
      });
    }
  });

  // Toggle Audio State
  socket.on('toggle-audio', ({ isAudioOn }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const roomUsers = rooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.id)) {
      const user = roomUsers.get(socket.id);
      user.isAudioOn = isAudioOn;
      socket.to(roomId).emit('user-audio-toggled', {
        socketId: socket.id,
        isAudioOn
      });
    }
  });

  // In-Meeting Chat Messages
  socket.on('send-chat-message', ({ message }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId || !message || !message.trim()) return;

    const roomUsers = rooms.get(roomId);
    const user = roomUsers?.get(socket.id);
    const senderName = user ? user.userName : 'Participant';

    const chatPayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      senderSocketId: socket.id,
      senderName,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.in(roomId).emit('new-chat-message', chatPayload);
  });

  // Live Captions Broadcast
  socket.on('send-caption', ({ text, isFinal }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId || !text || !text.trim()) return;

    const roomUsers = rooms.get(roomId);
    const user = roomUsers?.get(socket.id);
    const senderName = user ? user.userName : 'Participant';

    socket.to(roomId).emit('new-caption', {
      senderSocketId: socket.id,
      senderName,
      text: text.trim(),
      isFinal: Boolean(isFinal),
      timestamp: Date.now()
    });
  });

  // Explicit Leave Meeting
  socket.on('leave-meeting', () => {
    handleLeaveRoom();
  });

  // Client Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    handleLeaveRoom();
  });
});

// Serve frontend build if available
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`>>> MeetSync server running on http://localhost:${PORT}`);
  console.log(`>>> Connected to Neon PostgreSQL Database via DATABASE_URL`);
  console.log(`>>> Allowed Client Origin: ${JSON.stringify(allowedOrigins)}`);
});
