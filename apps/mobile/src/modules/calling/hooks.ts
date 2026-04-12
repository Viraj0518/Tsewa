import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSocket } from '../../lib/socket';
import { useCallStore } from './store';

export function useCallSocket() {
  const router = useRouter();
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const acceptCallInStore = useCallStore((s) => s.acceptCall);
  const endCallInStore = useCallStore((s) => s.endCall);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = (data: {
      matchId: string;
      callerName: string;
      callerAvatar: string | null;
      isVideo: boolean;
    }) => {
      setIncomingCall({
        matchId: data.matchId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        isVideo: data.isVideo,
      });
    };

    const handleAnswered = (data: {
      matchId: string;
      otherName: string;
      otherAvatar: string | null;
      isVideo: boolean;
    }) => {
      // The other party answered our outgoing call
      // activeCall should already be set from initiateCall, but update startedAt
      useCallStore.setState({
        activeCall: {
          matchId: data.matchId,
          otherName: data.otherName,
          otherAvatar: data.otherAvatar,
          isVideo: data.isVideo,
          startedAt: Date.now(),
        },
      });
    };

    const handleEnded = () => {
      endCallInStore();
    };

    socket.on('call_incoming', handleIncoming);
    socket.on('call_answered', handleAnswered);
    socket.on('call_ended', handleEnded);

    return () => {
      socket.off('call_incoming', handleIncoming);
      socket.off('call_answered', handleAnswered);
      socket.off('call_ended', handleEnded);
    };
  }, [setIncomingCall, acceptCallInStore, endCallInStore]);

  const initiateCall = useCallback(
    (
      matchId: string,
      isVideo: boolean,
      otherName: string,
      otherAvatar: string | null
    ) => {
      const socket = getSocket();
      if (!socket) return;

      socket.emit('call_offer', { matchId, isVideo });

      // Optimistically set active call (will show "Calling..." state)
      useCallStore.setState({
        activeCall: {
          matchId,
          otherName,
          otherAvatar,
          isVideo,
          startedAt: Date.now(),
        },
      });

      // Navigate to call screen
      router.push(`/(app)/call/${matchId}` as any);
    },
    [router]
  );

  const answerCall = useCallback(() => {
    const socket = getSocket();
    const incoming = useCallStore.getState().incomingCall;
    if (!socket || !incoming) return;

    socket.emit('call_answer', { matchId: incoming.matchId });
    acceptCallInStore();

    // Navigate to call screen
    router.push(`/(app)/call/${incoming.matchId}` as any);
  }, [router, acceptCallInStore]);

  const rejectCall = useCallback(() => {
    const socket = getSocket();
    const incoming = useCallStore.getState().incomingCall;
    if (!socket || !incoming) return;

    socket.emit('call_end', { matchId: incoming.matchId });
    useCallStore.getState().rejectCall();
  }, []);

  const endCall = useCallback(() => {
    const socket = getSocket();
    const active = useCallStore.getState().activeCall;
    if (!socket || !active) return;

    socket.emit('call_end', { matchId: active.matchId });
    endCallInStore();
  }, [endCallInStore]);

  return { initiateCall, answerCall, rejectCall, endCall };
}
