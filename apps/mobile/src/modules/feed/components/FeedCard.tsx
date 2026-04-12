import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Avatar } from '../../../components/ui/Avatar';
import { useLikePost } from '../hooks';
import type { FeedPost } from '../api';

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

interface FeedCardProps {
  post: FeedPost;
}

export function FeedCard({ post }: FeedCardProps) {
  const router = useRouter();
  const likeMutation = useLikePost();
  const [isLiked, setIsLiked] = React.useState(post.isLiked);
  const [likeCount, setLikeCount] = React.useState(post.likeCount);

  React.useEffect(() => {
    setIsLiked(post.isLiked);
    setLikeCount(post.likeCount);
  }, [post.isLiked, post.likeCount]);

  const handleLike = () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    likeMutation.mutate(post.id);
  };

  return (
    <Pressable onPress={() => router.push(`/feed/${post.id}`)}>
      <View style={styles.card}>
        {/* Author row */}
        <View style={styles.authorRow}>
          <Avatar
            uri={post.authorPhoto}
            name={post.authorName}
            size="sm"
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.contentText} numberOfLines={6}>
          {post.content}
        </Text>

        {/* Image */}
        {post.type === 'PHOTO' && post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {/* Like button */}
          <Pressable style={styles.actionButton} onPress={handleLike}>
            <MotiView
              animate={{ scale: isLiked ? 1.15 : 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            >
              <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                {isLiked ? '♥' : '♡'}
              </Text>
            </MotiView>
            {likeCount > 0 && (
              <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
                {likeCount}
              </Text>
            )}
          </Pressable>

          {/* Comment button */}
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push(`/feed/${post.id}`)}
          >
            <Text style={styles.actionIcon}>💬</Text>
            {post.commentCount > 0 && (
              <Text style={styles.actionCount}>{post.commentCount}</Text>
            )}
          </Pressable>

          {/* Share button */}
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>↗</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  timeText: {
    ...typography.small,
    color: colors.gray400,
  },
  contentText: {
    ...typography.body,
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionIcon: {
    fontSize: 18,
    color: colors.gray400,
  },
  likedIcon: {
    color: colors.lavender,
  },
  actionCount: {
    ...typography.caption,
    color: colors.gray400,
  },
  likedCount: {
    color: colors.lavender,
  },
});
