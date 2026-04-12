import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';
import { scale } from '../../../src/theme/responsive';
import { Avatar } from '../../../src/components/ui/Avatar';
import { usePost, useLikePost } from '../../../src/modules/feed/hooks';
import { CommentSheet } from '../../../src/modules/feed/components/CommentSheet';

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

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { data: post } = usePost(postId!);
  const likeMutation = useLikePost();
  const [isLiked, setIsLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);

  React.useEffect(() => {
    if (post) {
      setIsLiked(post.isLiked);
      setLikeCount(post.likeCount);
    }
  }, [post]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    likeMutation.mutate(postId!);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 50 }} />
      </View>

      {post && (
        <>
          {/* Post content in top section */}
          <View style={styles.postSection}>
            <View style={styles.authorRow}>
              <Avatar
                uri={post.authorPhoto}
                name={post.authorName}
                size="md"
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.authorName}</Text>
                <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
              </View>
            </View>

            <Text style={styles.contentText}>{post.content}</Text>

            {post.type === 'PHOTO' && post.imageUrl && (
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.postImage}
              />
            )}

            {/* Like row */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionButton} onPress={handleLike}>
                <MotiView
                  animate={{ scale: isLiked ? 1.15 : 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                >
                  <Text
                    style={[styles.actionIcon, isLiked && styles.likedIcon]}
                  >
                    {isLiked ? '♥' : '♡'}
                  </Text>
                </MotiView>
                <Text
                  style={[styles.actionCount, isLiked && styles.likedCount]}
                >
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Text>
              </Pressable>

              <Text style={styles.commentCountText}>
                {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>

          {/* Comments section */}
          <CommentSheet postId={postId!} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backText: {
    ...typography.body,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.black,
  },
  postSection: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...typography.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  timeText: {
    ...typography.caption,
    color: colors.gray400,
  },
  contentText: {
    ...typography.bodyLarge,
    color: colors.gray600,
    lineHeight: 24,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: scale(16),
    resizeMode: 'cover',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 20,
    color: colors.gray400,
  },
  likedIcon: {
    color: colors.lavender,
  },
  actionCount: {
    ...typography.body,
    color: colors.gray400,
  },
  likedCount: {
    color: colors.lavender,
  },
  commentCountText: {
    ...typography.body,
    color: colors.gray400,
  },
});
