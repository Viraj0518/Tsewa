import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { scale, verticalScale } from '../../../theme/responsive';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { useAuthStore } from '../../auth/store';
import { useRoom, useJoinRoom, useLeaveRoom, useRoomSocket } from '../../rooms/hooks';
import { useRoomStore } from '../../rooms/store';
import { SpeakerAvatar } from '../../rooms/components/SpeakerAvatar';
import { getSocket } from '../../../lib/socket';
import { useWatchPartySocket } from '../hooks';
import { VideoPlayer } from './VideoPlayer';
import { ReactionBurst } from './ReactionBurst';
import type { RoomMessage } from '../../rooms/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ========================
// Props
// ========================

interface WatchPartyScreenProps {
  roomId: string;
}

// ========================
// Main Component
// ========================

export function WatchPartyScreen({ roomId }: WatchPartyScreenProps) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: room, isLoading } = useRoom(roomId);
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();
  const { sendMessage, participants, messages, raisedHands, isEnded } =
    useRoomSocket(roomId);
  const { playbackState, play, pause, seek, changeVideo, isHost } =
    useWatchPartySocket(roomId);

  const isMuted = useRoomStore((s) => s.isMuted);
  const handRaised = useRoomStore((s) => s.handRaised);
  const setMuted = useRoomStore((s) => s.setMuted);
  const setHandRaised = useRoomStore((s) => s.setHandRaised);

  const [messageText, setMessageText] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  const myParticipant = participants.find((p) => p.userId === currentUser?.id);
  const isSpeaker =
    myParticipant?.role === 'SPEAKER' || myParticipant?.role === 'HOST';

  // Partition participants
  const speakers = participants.filter(
    (p) => p.role === 'HOST' || p.role === 'SPEAKER'
  );

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

  // Video area height: 55% of screen
  const videoAreaHeight = SCREEN_HEIGHT * 0.55;
  const playerHeight = verticalScale(220);

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

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessage(messageText.trim());
    setMessageText('');
  };

  const handleChangeVideo = () => {
    if (!videoUrlInput.trim()) return;
    changeVideo(videoUrlInput.trim());
    setVideoUrlInput('');
    setShowVideoInput(false);
  };

  const handleReaction = useCallback(
    (emoji: string) => {
      const socket = getSocket();
      if (socket) {
        socket.emit('room:send_message', {
          roomId,
          content: emoji,
        });
      }
    },
    [roomId]
  );

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
        {/* ============================== */}
        {/* TOP HALF: Video Player Area    */}
        {/* ============================== */}
        <View style={[styles.videoArea, { height: videoAreaHeight }]}>
          {/* Header overlay */}
          <View style={styles.videoHeader}>
            <View style={styles.videoHeaderLeft}>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {room?.title ?? 'Watch Party'}
              </Text>
              <Text style={styles.videoParticipants}>
                {participants.length} watching
              </Text>
            </View>
            <Pressable onPress={handleLeave} style={styles.leaveButtonTop}>
              <Text style={styles.leaveButtonTopText}>Leave</Text>
            </Pressable>
          </View>

          {/* YouTube Player */}
          <VideoPlayer
            videoUrl={playbackState.videoUrl}
            isPlaying={playbackState.isPlaying}
            currentTime={playbackState.currentTime}
            isHost={isHost}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
            height={playerHeight}
          />

          {/* Video URL display + Change button (host only) */}
          {isHost && (
            <View style={styles.videoUrlBar}>
              {showVideoInput ? (
                <View style={styles.videoInputRow}>
                  <TextInput
                    style={styles.videoUrlInput}
                    value={videoUrlInput}
                    onChangeText={setVideoUrlInput}
                    placeholder="Paste YouTube URL..."
                    placeholderTextColor={colors.gray500}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleChangeVideo}
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleChangeVideo} style={styles.videoUrlSubmit}>
                    <Text style={styles.videoUrlSubmitText}>Set</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowVideoInput(false)}
                    style={styles.videoUrlCancel}
                  >
                    <Text style={styles.videoUrlCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowVideoInput(true)}
                  style={styles.changeVideoButton}
                >
                  <Text style={styles.changeVideoIcon}>🎬</Text>
                  <Text style={styles.changeVideoText} numberOfLines={1}>
                    {playbackState.videoUrl
                      ? 'Change Video'
                      : 'Set Video URL'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Reaction burst overlay */}
          <View style={styles.reactionOverlay}>
            <ReactionBurst onReaction={handleReaction} />
          </View>
        </View>

        {/* ============================== */}
        {/* BOTTOM HALF: Mini Audio Room   */}
        {/* ============================== */}
        <View style={styles.roomArea}>
          {/* Speaker avatars row */}
          <View style={styles.speakerRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.speakerScrollContent}
            >
              {speakers.map((speaker) => (
                <SpeakerAvatar
                  key={speaker.userId}
                  uri={speaker.photoUrl}
                  name={speaker.displayName}
                  isHost={speaker.role === 'HOST'}
                  isSpeaking={
                    (speaker.role === 'HOST' || speaker.role === 'SPEAKER')
                      ? !speaker.isMuted
                      : false
                  }
                  isMuted={speaker.isMuted}
                  handRaised={speaker.handRaised}
                  size="listener"
                />
              ))}
              {speakers.length === 0 && (
                <Text style={styles.emptyLabel}>No speakers yet</Text>
              )}
            </ScrollView>
          </View>

          {/* Chat messages */}
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isOwn={item.userId === currentUser?.id}
              />
            )}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              chatListRef.current?.scrollToEnd({ animated: true });
            }}
            ListEmptyComponent={
              <Text style={styles.chatEmpty}>No messages yet. Say hi!</Text>
            }
          />

          {/* Chat input bar */}
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

          {/* Bottom controls */}
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
                  animate={{ scale: handRaised ? 1.2 : 1 }}
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

            {/* Raised hand indicator (host only) */}
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
    backgroundColor: '#1A1A1A',
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Video Area (Top 55%) ----
  videoArea: {
    backgroundColor: '#1A1A1A',
    position: 'relative',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    zIndex: 10,
  },
  videoHeaderLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  videoTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  videoParticipants: {
    color: colors.gray400,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  leaveButtonTop: {
    backgroundColor: colors.error + 'CC',
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  leaveButtonTopText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // Video URL bar
  videoUrlBar: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
  },
  videoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  videoUrlInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    color: colors.white,
    fontSize: fontSize.sm,
  },
  videoUrlSubmit: {
    backgroundColor: colors.lavender,
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(12),
  },
  videoUrlSubmitText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  videoUrlCancel: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(8),
  },
  videoUrlCancelText: {
    color: colors.gray400,
    fontSize: fontSize.sm,
  },
  changeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(16),
    alignSelf: 'flex-start',
    gap: scale(6),
  },
  changeVideoIcon: {
    fontSize: scale(14),
  },
  changeVideoText: {
    color: colors.gray300,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  // Reaction overlay
  reactionOverlay: {
    position: 'absolute',
    bottom: scale(4),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },

  // ---- Room Area (Bottom 45%) ----
  roomArea: {
    flex: 1,
    backgroundColor: colors.softWhite,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    overflow: 'hidden',
  },

  // Speaker row
  speakerRow: {
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  speakerScrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(4),
    alignItems: 'center',
  },
  emptyLabel: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    fontStyle: 'italic',
    paddingHorizontal: scale(16),
  },

  // Chat
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    gap: scale(6),
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
    paddingVertical: scale(6),
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
    marginBottom: 1,
  },
  chatContent: {
    fontSize: fontSize.sm,
    color: colors.black,
    lineHeight: 18,
  },

  // Chat Input
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    gap: scale(8),
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    fontSize: fontSize.md,
    color: colors.black,
  },
  sendButton: {
    backgroundColor: colors.lavender,
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
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
    paddingVertical: scale(8),
    paddingHorizontal: scale(20),
    backgroundColor: colors.softWhite,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: scale(20),
  },
  controlButton: {
    alignItems: 'center',
    gap: 3,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  raisedHandIndicator: {
    backgroundColor: colors.peach + '30',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(14),
  },
  raisedHandText: {
    fontSize: fontSize.sm,
    color: colors.peachDark,
    fontWeight: fontWeight.semibold,
  },
  leaveControl: {
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.error + '15',
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(18),
  },
  leaveControlIcon: {
    fontSize: 14,
    color: colors.error,
    fontWeight: fontWeight.bold,
  },
  leaveControlLabel: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
});
