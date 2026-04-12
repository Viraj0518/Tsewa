import { useEffect, useRef, useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { getMessages, uploadMedia, Message, MessagesResponse, MessageType } from './api';
import { getSocket } from '../../lib/socket';
import { useChatStore } from './store';

const MESSAGES_KEY = (matchId: string) => ['messages', matchId];

export function useMessages(matchId: string) {
  return useInfiniteQuery({
    queryKey: MESSAGES_KEY(matchId),
    queryFn: ({ pageParam }) => getMessages(matchId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!matchId,
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      uri,
      type,
    }: {
      matchId: string;
      uri: string;
      type: MessageType;
    }) => uploadMedia(matchId, uri, type),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: MESSAGES_KEY(variables.matchId),
      });
    },
  });
}

interface UseChatSocketReturn {
  sendMessage: (text: string) => void;
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useChatSocket(matchId: string): UseChatSocketReturn {
  const queryClient = useQueryClient();
  const typingUsers = useChatStore((s) => s.typingUsers);
  const setTyping = useChatStore((s) => s.setTyping);
  const incrementUnread = useChatStore((s) => s.incrementUnread);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocalTypingRef = useRef(false);

  const isTyping = typingUsers[matchId] ?? false;

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !matchId) return;

    socket.emit('join_chat', matchId);

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        MESSAGES_KEY(matchId),
        (old) => {
          if (!old) return old;

          const firstPage = old.pages[0];
          if (!firstPage) return old;

          // Avoid duplicates
          const exists = firstPage.messages.some((m) => m.id === message.id);
          if (exists) return old;

          return {
            ...old,
            pages: [
              {
                ...firstPage,
                messages: [message, ...firstPage.messages],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );

      // Also invalidate matches to update last message preview
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    };

    const handleUserTyping = () => {
      setTyping(matchId, true);
    };

    const handleUserStoppedTyping = () => {
      setTyping(matchId, false);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.emit('leave_chat', matchId);
      setTyping(matchId, false);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId, queryClient, setTyping, incrementUnread]);

  const sendMessage = useCallback(
    (text: string) => {
      const socket = getSocket();
      if (!socket || !text.trim()) return;

      socket.emit('send_message', {
        matchId,
        text: text.trim(),
        type: 'TEXT',
      });
    },
    [matchId]
  );

  const stopTyping = useCallback(() => {
    if (!isLocalTypingRef.current) return;
    isLocalTypingRef.current = false;

    const socket = getSocket();
    if (socket) {
      socket.emit('typing_stop', { matchId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [matchId]);

  const startTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    if (!isLocalTypingRef.current) {
      isLocalTypingRef.current = true;
      socket.emit('typing_start', { matchId });
    }

    // Reset the auto-stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [matchId, stopTyping]);

  return { sendMessage, isTyping, startTyping, stopTyping };
}
