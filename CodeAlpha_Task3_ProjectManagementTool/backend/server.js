const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./config/db');
const { seedDatabase } = require('./config/seed');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const columnRoutes = require('./routes/columns');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// Socket.io initialization
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass socket.io to express app instance
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', columnRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  // User subscription for personal notifications
  socket.on('user_login', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} subscribed to notification channel.`);
  });

  // Join a specific project workspace room
  socket.on('join_project', (projectId) => {
    const roomName = `project_${projectId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  // Leave project workspace room
  socket.on('leave_project', (projectId) => {
    const roomName = `project_${projectId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Fallback to index.html for single-page routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Initialize DB & Start Server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDB();
  await seedDatabase();

  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 Collaborative Project Management Server Running!`);
    console.log(`🌐 Local Access: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

startServer();
