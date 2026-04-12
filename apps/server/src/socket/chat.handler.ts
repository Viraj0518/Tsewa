import type { Server, Socket } from 'socket.io';
import * as messageService from '../services/message.service';
import { prisma } from '../config/prisma';
import type { MessageType, Prisma } from '@prisma/client';

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = socket.user.id;

  // Join a chat room (match chat)
  socket.on('join_chat', async (data: { matchId: string }) => {
    try {
      const { matchId } = data;

      // Verify user is part of this match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!match || (match.userAId !== userId && match.userBId !== userId)) {
        socket.emit('error', { message: 'Not authorized to join this chat' });
        return;
      }

      if (!match.isActive) {
        socket.emit('error', { message: 'This match is no longer active' });
        return;
      }

      socket.join(`chat:${matchId}`);
      socket.emit('joined_chat', { matchId, chatRoom: match.chatRoom });
    } catch (err) {
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Send a message
  socket.on(
    'send_message',
    async (data: { matchId: string; type?: MessageType; content: string; metadata?: Prisma.InputJsonValue }) => {
      try {
        const { matchId, type = 'TEXT', content, metadata } = data;

        const message = await messageService.createMessage(
          matchId,
          userId,
          type,
          content,
          metadata
        );

        // Emit to all users in the chat room
        io.to(`chat:${matchId}`).emit('new_message', message);

        // Also emit to the other user's personal room (for notifications)
        const match = await prisma.match.findUnique({
          where: { id: matchId },
        });

        if (match) {
          const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
          io.to(`user:${otherUserId}`).emit('new_message_notification', {
            matchId,
            message,
          });
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Failed to send message';
        socket.emit('error', { message: errMessage });
      }
    }
  );

  // Typing indicators
  socket.on('typing_start', (data: { matchId: string }) => {
    socket.to(`chat:${data.matchId}`).emit('user_typing', {
      matchId: data.matchId,
      userId,
    });
  });

  socket.on('typing_stop', (data: { matchId: string }) => {
    socket.to(`chat:${data.matchId}`).emit('user_stopped_typing', {
      matchId: data.matchId,
      userId,
    });
  });

  // Mark messages as read
  socket.on('mark_read', async (data: { matchId: string }) => {
    try {
      const result = await messageService.markAsRead(data.matchId, userId);

      // Notify the other user that messages were read
      socket.to(`chat:${data.matchId}`).emit('message_read', {
        matchId: data.matchId,
        readBy: userId,
        count: result.markedRead,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });
}
