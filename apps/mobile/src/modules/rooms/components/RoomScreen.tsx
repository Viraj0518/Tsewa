import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { useAuthStore } from '../../auth/store';
import { useRoom, useJoinRoom, useLeaveRoom, useRoomSocket } from '../hooks';
import { useRoomStore } from '../store';
import { SpeakerAvatar } from './SpeakerAvatar';
import { getSocket } from '../../../lib/socket';
import type { RoomMessage } from '../api';

interface RoomScreenProps {
  roomId: string;
}

export function RoomScreen({ roomId }: RoomScreenProps) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: room, isLoading } = useRoom(roomId);
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();
  const { sendMessage, participants, messages, raisedHands, isEnded } =
    useRoomSocket(roomId);

  const isMuted = useRoomStore((s) => s.isMuted);
  const handRaised = useRoomStore((s) => s.handRaised);
  const setMuted = useRoomStore((s) => s.setMuted);
  const setHandRaised = useRoomStore((s) => s.setHandRaised);

  const [messageText, setMessageText] = useState('');
  const chatScrollRef = useRef<FlatList>(null);

  const isHost = room?.hostId === currentUser?.id;
  const myParticipant = participants.find((p) => p.userId === currentUser?.id);
  const isSpeaker =
    myParticipant?.role === 'SPEAKER' || myParticipant?.role === 'HOST';

  // Join room on mount
  useEffect(() => {
    if (roomId) {
      joinRoom.mutate(roomId);
    }
  }, [roomId]);

  // Handle room ending
  useEffect(() => {
    if (isEnded) {
      Alert.alert('Room Ended', 'The host has ended this room.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isEnded]);

  // Partition participants
  const speakers = participants.filter(
    (p) => p.role === 'HOST' || p.role === 'SPEAKER'
  );
  const listeners = participants.filter((p) => p.role === 'LISTENER');
  const maxVisibleListeners = 12;
  const extraListeners = Math.max(0, listeners.length - maxVisibleListeners);
  const visibleListeners = listeners.slice(0, maxVisibleListeners);

  const handleLeave = () => {
    leaveRoom.mutate(roomId);
    router.back();
  };

  const handleToggleMute = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('room:toggle_mute', { roomId });
      setMuted(!isMuted);
    }
  };

  const handleRaiseHand = () => {
    const socket = getSocket();
    if (socket) {
      const event = handRaised ? 'room:lower_hand' : 'room:raise_hand';
      socket.emit(event, { roomId });
      setHandRaised(!handRaised);
    }
  };

  const handleInviteSpeaker = (userId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('room:invite_speaker', { roomId, targetUserId: userId });
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessage(messageText.trim());
    setMessageText('');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {room?.title ?? 'Room'}
            </Text>
            <View style={styles.headerMeta}>
              {room?.topicTag && (
                <Text style={styles.topicTag}>#{room.topicTag}</Text>
              )}
              <Text style={styles.participantCount}>
                👥 {participants.length}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleLeave} style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>Leave</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
          {/* Speaker Section */}
          <View style={styles.speakerSection}>
            <Text style={styles.sectionLabel}>Speakers</Text>
            <View style={styles.speakerGrid}>
              {speakers.map((speaker) => (
                <SpeakerAvatar
                  key={speaker.userId}
                  uri={speaker.photoUrl}
                  name={speaker.displayName}
                  isHost={speaker.role === 'HOST'}
                  isSpeaking={
                    speaker.role === 'HOST' || speaker.role === 'SPEAKER'
                      ? !speaker.isMuted
                      : false
                  }
                  isMuted={speaker.isMuted}
                  handRaised={speaker.handRaised}
                  size="speaker"
                />
              ))}
              {speakers.length === 0 && (
                <Text style={styles.emptyLabel}>No speakers yet</Text>
              )}
            </View>
          </View>

          {/* Listener Section */}
          <View style={styles.listenerSection}>
            <Text style={styles.sectionLabel}>
              Listeners ({listeners.length})
            </Text>
            <View style={styles.listenerGrid}>
              {visibleListeners.map((listener) => (
                <Pressable
                  key={listener.userId}
                  onPress={() => {
                    if (isHost && listener.handRaised) {
                      Alert.alert(
                        'Invite Speaker',
                        `Invite ${listener.displayName} to speak?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Invite',
                            onPress: () => handleInviteSpeaker(listener.userId),
                          },
                        ]
                      );
                    }
                  }}
                >
                  <SpeakerAvatar
                    uri={listener.photoUrl}
                    name={listener.displayName}
                    handRaised={listener.handRaised}
                    size="listener"
                  />
                </Pressable>
              ))}
            </View>
            {extraListeners > 0 && (
              <Text style={styles.moreListeners}>
                and {extraListeners} more
              </Text>
            )}
          </View>

          {/* Chat Section */}
          <View style={styles.chatSection}>
            <Text style={styles.sectionLabel}>Chat</Text>
            <View style={styles.chatList}>
              {messages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Say hi!</Text>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.userId === currentUser?.id}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Chat Input */}
        <View style={styles.chatInputBar}>
          <TextInput
            style={styles.chatInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Say something..."
            placeholderTextColor={colors.gray400}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSendMessage}
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            disabled={!messageText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlBar}>
          {/* Mute/Unmute (only for speakers/host) */}
          {isSpeaker && (
            <Pressable onPress={handleToggleMute} style={styles.controlButton}>
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙'}</Text>
              <Text style={styles.controlLabel}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </Pressable>
          )}

          {/* Raise Hand (for listeners) */}
          {!isSpeaker && (
            <Pressable onPress={handleRaiseHand} style={styles.controlButton}>
              <MotiView
                animate={{
                  scale: handRaised ? 1.2 : 1,
                }}
                transition={{ type: 'timing', duration: 200 }}
              >
                <Text style={styles.controlIcon}>
                  {handRaised ? '✋' : '🤚'}
                </Text>
              </MotiView>
              <Text style={styles.controlLabel}>
                {handRaised ? 'Lower' : 'Raise'}
              </Text>
            </Pressable>
          )}

          {/* Invite Speaker (host only) */}
          {isHost && raisedHands.length > 0 && (
            <View style={styles.raisedHandIndicator}>
              <Text style={styles.raisedHandText}>
                ✋ {raisedHands.length}
              </Text>
            </View>
          )}

          {/* Leave */}
          <Pressable onPress={handleLeave} style={styles.leaveControl}>
            <Text style={styles.leaveControlIcon}>✕</Text>
            <Text style={styles.leaveControlLabel}>Leave</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ========================
// Chat Bubble
// ========================

function ChatBubble({
  message,
  isOwn,
}: {
  message: RoomMessage;
  isOwn: boolean;
}) {
  return (
    <View style={[styles.chatBubble, isOwn && styles.chatBubbleOwn]}>
      <Text style={styles.chatSender}>{message.displayName}</Text>
      <Text style={styles.chatContent}>{message.content}</Text>
    </View>
  );
}

// ========================
// Styles
// ========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.softWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  roomTitle: {
    ...typography.h3,
    color: colors.black,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: 2,
  },
  topicTag: {
    fontSize: fontSize.xs,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  participantCount: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  leaveButton: {
    backgroundColor: colors.error,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  leaveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Sections
  speakerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  listenerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray500,
    marginBottom: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speakerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  listenerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(4),
  },
  emptyLabel: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    fontStyle: 'italic',
  },
  moreListeners: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    marginTop: scale(8),
    textAlign: 'center',
  },

  // Chat
  chatSection: {
    padding: 20,
    minHeight: 200,
  },
  chatList: {
    gap: scale(8),
  },
  chatEmpty: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: scale(20),
  },
  chatBubble: {
    backgroundColor: colors.white,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    maxWidth: '85%',
  },
  chatBubbleOwn: {
    backgroundColor: colors.lavender + '20',
    alignSelf: 'flex-end',
  },
  chatSender: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.lavender,
    marginBottom: 2,
  },
  chatContent: {
    fontSize: fontSize.sm,
    color: colors.black,
    lineHeight: 20,
  },

  // Chat Input
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    gap: scale(8),
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: fontSize.md,
    color: colors.black,
  },
  sendButton: {
    backgroundColor: colors.lavender,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Bottom Controls
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.softWhite,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: scale(24),
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  raisedHandIndicator: {
    backgroundColor: colors.peach + '30',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  raisedHandText: {
    fontSize: fontSize.sm,
    color: colors.peachDark,
    fontWeight: fontWeight.semibold,
  },
  leaveControl: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error + '15',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  leaveControlIcon: {
    fontSize: 16,
    color: colors.error,
    fontWeight: fontWeight.bold,
  },
  leaveControlLabel: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
});
