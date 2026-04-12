import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Message } from '../api';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  showTimestamp: boolean;
  isGrouped: boolean;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function MessageBubbleComponent({
  message,
  isSent,
  showTimestamp,
  isGrouped,
}: MessageBubbleProps) {
  const bubbleRadius = scale(18);

  const sentBorderRadius = {
    borderTopLeftRadius: bubbleRadius,
    borderTopRightRadius: isGrouped ? bubbleRadius : bubbleRadius,
    borderBottomLeftRadius: bubbleRadius,
    borderBottomRightRadius: isGrouped ? bubbleRadius : scale(4),
  };

  const receivedBorderRadius = {
    borderTopLeftRadius: isGrouped ? bubbleRadius : bubbleRadius,
    borderTopRightRadius: bubbleRadius,
    borderBottomLeftRadius: isGrouped ? bubbleRadius : scale(4),
    borderBottomRightRadius: bubbleRadius,
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
      style={[
        styles.wrapper,
        isSent ? styles.wrapperSent : styles.wrapperReceived,
        isGrouped && styles.wrapperGrouped,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
          isSent ? sentBorderRadius : receivedBorderRadius,
        ]}
      >
        {message.type === 'TEXT' && (
          <Text
            style={[
              styles.messageText,
              isSent ? styles.messageTextSent : styles.messageTextReceived,
            ]}
          >
            {message.text}
          </Text>
        )}

        {message.type === 'IMAGE' && (
          <Text style={styles.placeholderText}>[Image]</Text>
        )}

        {message.type === 'VOICE' && (
          <Text style={styles.placeholderText}>[Voice message]</Text>
        )}

        {message.type === 'GIF' && (
          <Text style={styles.placeholderText}>[GIF]</Text>
        )}
      </View>

      {showTimestamp && (
        <Text
          style={[
            styles.timestamp,
            isSent ? styles.timestampSent : styles.timestampReceived,
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      )}
    </MotiView>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  wrapperSent: {
    alignItems: 'flex-end',
  },
  wrapperReceived: {
    alignItems: 'flex-start',
  },
  wrapperGrouped: {
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
  },
  bubbleSent: {
    backgroundColor: colors.lavender,
  },
  bubbleReceived: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
  },
  messageTextSent: {
    color: colors.white,
  },
  messageTextReceived: {
    color: colors.black,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.gray400,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.gray400,
    marginTop: 2,
    marginBottom: 6,
  },
  timestampSent: {
    marginRight: 4,
  },
  timestampReceived: {
    marginLeft: 4,
  },
});
