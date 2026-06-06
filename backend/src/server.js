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

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) { 
    return [
      'http://localhost:5173',
      "attender-ko0n489px-ayush989889898s-projects.vercel.app",
      'http://127.0.0.1:5173',
    ];
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isNgrokOrigin(origin) {
  // Common ngrok domains as of recent ngrok releases
  // Examples: https://abcd-1234.ngrok-free.app, https://abcd-1234.ngrok-free.dev, https://myname.ngrok.app
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return (
      hostname.endsWith('.ngrok-free.dev') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.dev') ||
      hostname.endsWith('.ngrok.app') ||
      hostname.endsWith('.ngrok.io')
    );
  } catch {
    return false;
  }
}



const corsOrigins = parseCorsOrigins();
const allowAllOrigins = process.env.CORS_ALLOW_ALL === 'true';

function corsOriginFn(origin, callback) {
  // Allow server-to-server / curl / same-origin (no Origin header)
  if (!origin) return callback(null, true);
  if (allowAllOrigins) return callback(null, true);
  if (corsOrigins.includes(origin)) return callback(null, true);
  if (isNgrokOrigin(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked origin: ${origin}`), false);
}

// Setup Socket.io
const io = new Server(server, {
  cors: { 
    origin: corsOriginFn,
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
  origin: corsOriginFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('Welcome to the Attender API');
});
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
    console.log(`🌍 Public via ngrok: run "ngrok http ${port}"`);
  });
});
