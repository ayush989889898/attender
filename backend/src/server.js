import 'dotenv/config';
import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDb } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classRoutes from './routes/classRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);
const server = http.createServer(app); 

// Allow both localhost and your Network IP for mobile testing
const corsOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'http://192.168.1.4:5173' 
];

// Setup Socket.io
const io = new Server(server, {
  cors: { 
    origin: corsOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
  }
});

// Real-time Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join_room', (roomId) => socket.join(roomId));
  socket.on('send_message', (data) => io.to(data.roomId).emit('receive_message', data.message));
  socket.on('disconnect', () => console.log('User disconnected'));
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

connectDb().then(() => {
  // Use '0.0.0.0' to listen on all network interfaces
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 Server running locally: http://localhost:${port}`);
    console.log(`📱 Mobile/Network Access: http://192.168.1.4:${port}`);
  });
});