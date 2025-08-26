import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import FastTouchable from './FastTouchable';
import { NewsArticle } from './types';
import { scaleFont, responsiveLines } from './utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InshortsCardProps {
  article: NewsArticle;
  onPress?: (article: NewsArticle) => void;
  onBookmark?: (id: string | number) => void;
  isBookmarked?: boolean;
}

export default function InshortsCard({ article, onPress, onBookmark, isBookmarked }: InshortsCardProps) {
  const imageHeight = Math.round(screenHeight * 0.45);

  const getHostname = (raw?: string) => {
    if (!raw) return null;
    try {
      // remove protocol
      return raw.replace(/(^\w+:|^)\/\//, '').split('/')[0].replace(/^www\./, '');
    } catch (e) {
      return null;
    }
  };

  const openArticle = async () => {
    const url = article.sourceUrl || article.link;
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const share = async () => {
    try {
      const shareUrl = article.sourceUrl || article.link || '';
      const message = shareUrl ? `${article.headline}\n\nRead more: ${shareUrl}` : article.headline;
      await Share.share({ message, title: article.headline });
    } catch (e) {
      // ignore
    }
  };

  return (
    <FastTouchable activeOpacity={0.95} onPress={() => onPress?.(article)} style={styles.card}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: article.image || article.imageUrl || 'https://via.placeholder.com/800x600' }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="cover"
        />

        {/* Category chip */}
        <View style={styles.chip}>
          <Text style={styles.chipText}>{article.category || 'Top'}</Text>
        </View>

        {/* Floating actions */}
        <View style={styles.floatingActions}>
          <FastTouchable onPress={() => onBookmark && onBookmark(article.id)} style={styles.iconButton}>
            <Text style={styles.iconText}>{isBookmarked ? '★' : '☆'}</Text>
          </FastTouchable>
          <FastTouchable onPress={share} style={styles.iconButton}>
            <Text style={styles.iconText}>↗</Text>
          </FastTouchable>
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.headline}>{article.headline}</Text>
  <Text numberOfLines={responsiveLines(screenHeight, 12, 8)} style={[styles.description, { fontSize: scaleFont(15), lineHeight: 22 }]}>{article.description}</Text>

        {/* Dev-only visual marker to verify this component is the one rendered */}
        {__DEV__ && (
          <Text style={styles.debug}>debug: descLines=10</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.source}>{getHostname(article.sourceUrl) || getHostname(article.link) || 'Source'}</Text>
          {article.timestamp ? <Text style={styles.dot}>•</Text> : null}
          {article.timestamp ? <Text style={styles.time}>{new Date(article.timestamp).toLocaleString()}</Text> : null}
        </View>
      </View>
  </FastTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  imageWrap: {
    width: '100%',
    backgroundColor: '#222',
  },
  image: {
    width: '100%',
  },
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingActions: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  iconText: {
    color: '#fff',
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headline: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
  color: '#ccc',
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: '#999',
    fontSize: 12,
  },
  dot: {
    color: '#999',
    marginHorizontal: 6,
  },
  time: {
    color: '#999',
    fontSize: 12,
  },
  debug: {
    color: '#0f0',
    fontSize: 10,
    marginTop: 6,
    opacity: 0.9,
  },
});
