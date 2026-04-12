import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';
import { scale } from '../../../src/theme/responsive';
import { Avatar } from '../../../src/components/ui/Avatar';
import { useMessages, useChatSocket, useUploadMedia } from '../../../src/modules/chat/hooks';
import { useChatStore } from '../../../src/modules/chat/store';
import { useMatches } from '../../../src/modules/matching/hooks';
import { useAuthStore } from '../../../src/modules/auth/store';
import { getSocket } from '../../../src/lib/socket';
import { MessageBubble } from '../../../src/modules/chat/components/MessageBubble';
import { ChatInput } from '../../../src/modules/chat/components/ChatInput';
import { TypingIndicator } from '../../../src/modules/chat/components/TypingIndicator';
import { VoiceNoteRecorder } from '../../../src/modules/chat/components/VoiceNote';
import { GifPicker } from '../../../src/modules/chat/components/GifPicker';
import { MediaPreview } from '../../../src/modules/chat/components/MediaPreview';
import { Message } from '../../../src/modules/chat/api';
import { useCallSocket } from '../../../src/modules/calling/hooks';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Calling
  const { initiateCall } = useCallSocket();

  // Rich media state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const uploadMedia = useUploadMedia();

  // Find the match to get other user info
  const { data: matches } = useMatches();
  const match = useMemo(
    () => matches?.find((m) => m.id === matchId),
    [matches, matchId]
  );
  const otherUser = match?.otherUser;

  // Messages
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(matchId!);

  // Chat socket
  const { sendMessage, isTyping, startTyping, stopTyping } = useChatSocket(
    matchId!
  );

  // Clear unread on mount
  const clearUnread = useChatStore((s) => s.clearUnread);
  useEffect(() => {
    if (!matchId) return;
    clearUnread(matchId);
    const socket = getSocket();
    if (socket) {
      socket.emit('mark_read', { matchId });
    }
  }, [matchId, clearUnread]);

  // Flatten all messages from infinite query pages
  const messages = useMemo(() => {
    if (!messagesData) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Determine if messages should be grouped and if timestamp should show
  const shouldShowTimestamp = useCallback(
    (index: number): boolean => {
      // In an inverted list, index 0 is the newest message
      if (index === messages.length - 1) return true;
      const current = messages[index];
      const next = messages[index + 1]; // next is older in inverted
      if (!current || !next) return true;
      if (current.senderId !== next.senderId) return true;

      // Show timestamp if messages are more than 5 minutes apart
      const diff =
        new Date(current.createdAt).getTime() -
        new Date(next.createdAt).getTime();
      return Math.abs(diff) > 5 * 60 * 1000;
    },
    [messages]
  );

  const isGrouped = useCallback(
    (index: number): boolean => {
      // A message is "grouped" if the next newer message (index - 1) is from the same sender
      if (index <= 0) return false;
      const current = messages[index];
      const newer = messages[index - 1];
      if (!current || !newer) return false;
      return current.senderId === newer.senderId;
    },
    [messages]
  );

  const renderMessage = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => (
      <MessageBubble
        message={item}
        isSent={item.senderId === currentUserId}
        showTimestamp={shouldShowTimestamp(index)}
        isGrouped={isGrouped(index)}
      />
    ),
    [currentUserId, shouldShowTimestamp, isGrouped]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
      stopTyping();
    },
    [sendMessage, stopTyping]
  );

  // Rich media handlers
  const handlePhotoSelected = useCallback(
    (uri: string) => {
      setPreviewImageUri(uri);
    },
    []
  );

  const handleSendPhoto = useCallback(() => {
    if (!previewImageUri || !matchId) return;
    uploadMedia.mutate({ matchId, uri: previewImageUri, type: 'IMAGE' });
    setPreviewImageUri(null);
  }, [previewImageUri, matchId, uploadMedia]);

  const handleCancelPhoto = useCallback(() => {
    setPreviewImageUri(null);
  }, []);

  const handleVoiceNoteComplete = useCallback(
    (uri: string, _durationMs: number) => {
      if (!matchId) return;
      uploadMedia.mutate({ matchId, uri, type: 'VOICE' });
      setShowVoiceRecorder(false);
    },
    [matchId, uploadMedia]
  );

  const handleVoiceNoteCancel = useCallback(() => {
    setShowVoiceRecorder(false);
  }, []);

  const handleSelectGif = useCallback(
    (gifUrl: string) => {
      if (!matchId) return;
      const socket = getSocket();
      if (socket) {
        socket.emit('send_message', {
          matchId,
          text: gifUrl,
          type: 'GIF',
          mediaUrl: gifUrl,
        });
      }
    },
    [matchId]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/matches');
    }
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </Pressable>

        <Pressable style={styles.headerCenter}>
          <Avatar
            uri={otherUser?.photoUrl}
            name={otherUser?.displayName}
            size="sm"
          />
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser?.displayName ?? 'Chat'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.callButton}
          hitSlop={12}
          onPress={() =>
            matchId &&
            initiateCall(
              matchId,
              false,
              otherUser?.displayName ?? 'Unknown',
              otherUser?.photoUrl ?? null
            )
          }
        >
          <Text style={styles.callIcon}>{'\uD83D\uDCDE'}</Text>
        </Pressable>
        <Pressable
          style={styles.videoButton}
          hitSlop={12}
          onPress={() =>
            matchId &&
            initiateCall(
              matchId,
              true,
              otherUser?.displayName ?? 'Unknown',
              otherUser?.photoUrl ?? null
            )
          }
        >
          <Text style={styles.videoIcon}>{'\uD83D\uDCF9'}</Text>
        </Pressable>
      </View>

      {/* Message List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lavender} />
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.lavender} />
              </View>
            ) : null
          }
          ListHeaderComponent={
            isTyping && otherUser ? (
              <TypingIndicator
                name={otherUser.displayName.split(' ')[0]}
              />
            ) : null
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input */}
      {showVoiceRecorder ? (
        <VoiceNoteRecorder
          onRecordingComplete={handleVoiceNoteComplete}
          onCancel={handleVoiceNoteCancel}
        />
      ) : (
        <ChatInput
          onSend={handleSend}
          onTyping={startTyping}
          onPhotoSelected={handlePhotoSelected}
          onVoiceNotePress={() => setShowVoiceRecorder(true)}
          onGifPress={() => setShowGifPicker(true)}
        />
      )}

      {/* Media Modals */}
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSelectGif}
      />
      <MediaPreview
        visible={!!previewImageUri}
        imageUri={previewImageUri}
        onSend={handleSendPhoto}
        onCancel={handleCancelPhoto}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
    lineHeight: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  headerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    flex: 1,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  callIcon: {
    fontSize: 16,
    color: colors.white,
  },
  videoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 16,
    color: colors.white,
  },
  // --- Messages ---
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  loadingMore: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
