import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { registerChatHandlers } from './chat.handler';
import { registerRoomHandlers } from './room.handler';

export interface SocketUser {
  id: string;
  email: string;
}

declare module 'socket.io' {
  interface Socket {
    user: SocketUser;
  }
}

let ioInstance: Server | null = null;

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call setupSocket first.');
  }
  return ioInstance;
}

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
      socket.user = { id: decoded.userId, email: decoded.email };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.id}`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Register handlers
    registerChatHandlers(io, socket);
    registerRoomHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.user.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error for user ${socket.user.id}:`, err.message);
    });
  });

  ioInstance = io;
  return io;
}
