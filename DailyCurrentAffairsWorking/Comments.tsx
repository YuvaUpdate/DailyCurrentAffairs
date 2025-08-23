import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated
} from 'react-native';
import { NewsArticle } from './types';

interface Comment {
  id: string;
  articleId: number;
  userId: string;
  userName: string;
  content: string;
  parentId?: string | null;
  likedBy: string[];
  replies?: Comment[];
}

interface CommentsProps {
  article: NewsArticle;
  visible: boolean;
  onClose: () => void;
  currentUser?: any;
}

// Animated wrapper for FlatList to safely support native driver onScroll when used elsewhere
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

export const Comments: React.FC<CommentsProps> = ({ article, visible, onClose, currentUser: propCurrentUser }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadComments();
      // Use prop user if available, otherwise fetch
      if (propCurrentUser) {
        setCurrentUser(propCurrentUser);
      } else {
        getCurrentUser();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, article.id, propCurrentUser]);

  const loadComments = async () => {
    setLoading(true);
    try {
      setComments([]);
      setLoading(false);
    } catch (error) {
      console.error('Error loading comments:', error);
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      // placeholder
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'Please login to comment');
      return;
    }

    setSubmitting(true);
    try {
      setNewComment('');
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login to like comments');
      return;
    }

    try {
      // placeholder
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to like comment');
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // placeholder
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isLiked = item.likedBy?.includes(currentUser?.uid || '');
    const canDelete = currentUser?.uid === item.userId;

    return (
      <View style={[styles.commentContainer, item.parentId && styles.replyContainer]}>
        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.userName}>{item.userName}</Text>
              <Text style={styles.timestamp}>{/* timestamp placeholder */}</Text>
            </View>
          </View>
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteComment(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.commentContent}>{item.content}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={[styles.actionButton, isLiked && styles.actionButtonLiked]}
            onPress={() => handleLikeComment(item.id)}
          >
            <Text style={[styles.actionText, isLiked && styles.actionTextLiked]}>♥</Text>
          </TouchableOpacity>

          {!item.parentId && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReply(item.id)}
            >
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>

        {replyingTo === item.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={styles.cancelReplyButton}
                onPress={() => { setReplyingTo(null); setNewComment(''); }}
              >
                <Text style={styles.cancelReplyText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitReplyButton}
                onPress={handleSubmitComment}
                disabled={submitting}
              >
                <Text style={styles.submitReplyText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Render replies */}
        {item.replies && item.replies.length > 0 && (
          <FlatList
            data={item.replies}
            keyExtractor={(reply) => reply.id}
            renderItem={renderComment}
            style={styles.repliesList}
          />
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        ) : (
          <>
            <AnimatedFlatList
              data={comments.filter(comment => !comment.parentId)}
              keyExtractor={(item: Comment) => item.id}
              renderItem={renderComment}
              style={styles.commentsList}
              contentContainerStyle={styles.commentsContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to comment</Text>
                </View>
              }
            />

            {currentUser && !replyingTo && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitComment}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>{submitting ? 'Posting...' : 'Post'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {!currentUser && (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Login to post comments</Text>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
  },
  commentContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  replyContainer: {
    marginLeft: 20,
    backgroundColor: '#F0F0F0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#DC3545',
    fontSize: 12,
    fontWeight: '600',
  },
  commentContent: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  actionButtonLiked: {
    backgroundColor: '#FFE5E5',
  },
  actionText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  actionTextLiked: {
    color: '#DC3545',
  },
  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 80,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelReplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelReplyText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitReplyButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitReplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  repliesList: {
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  loginPrompt: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666666',
  },
});
