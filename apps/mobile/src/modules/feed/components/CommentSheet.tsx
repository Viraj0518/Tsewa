import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { Avatar } from '../../../components/ui/Avatar';
import { usePost, useCommentOnPost } from '../hooks';
import type { FeedComment } from '../api';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CommentItemProps {
  comment: FeedComment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <View style={styles.commentItem}>
      <Avatar
        uri={comment.authorPhoto}
        name={comment.authorName}
        size="sm"
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  );
}

interface CommentSheetProps {
  postId: string;
}

export function CommentSheet({ postId }: CommentSheetProps) {
  const { data: post, isLoading } = usePost(postId);
  const commentMutation = useCommentOnPost();
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    commentMutation.mutate(
      { postId, content: text.trim() },
      {
        onSuccess: () => {
          setText('');
        },
      }
    );
  };

  const comments = post?.comments || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Comments ({post?.commentCount ?? 0})
        </Text>
      </View>

      {/* Comments list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lavender} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No comments yet</Text>
          <Text style={styles.emptySubtext}>Be the first to comment</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentItem comment={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor={colors.gray300}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendButton,
            !text.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!text.trim() || commentMutation.isPending}
        >
          {commentMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendText}>Post</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray400,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.gray300,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentContent: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  commentTime: {
    ...typography.small,
    color: colors.gray400,
  },
  commentText: {
    ...typography.body,
    color: colors.gray600,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...typography.body,
    color: colors.black,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.lavender,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
});
