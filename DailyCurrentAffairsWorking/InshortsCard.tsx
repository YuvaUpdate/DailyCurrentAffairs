import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import { showInApp } from './InAppBrowser';
import FastTouchable from './FastTouchable';
import OptimizedImage from './OptimizedImage';
import TextToSpeechService from './TextToSpeechService';
import { NewsArticle } from './types';
import { scaleFont, responsiveLines } from './utils/responsive';
// ...existing code... (truncate helper removed to show full descriptions)

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InshortsCardProps {
  article: NewsArticle;
  onPress?: (article: NewsArticle) => void;
  onBookmark?: (id: string | number) => void;
  isBookmarked?: boolean;
}

export default function InshortsCard({ article, onPress, onBookmark, isBookmarked }: InshortsCardProps) {
  const imageHeight = Math.round(screenHeight * 0.45);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const ttsService = TextToSpeechService.getInstance();

  useEffect(() => {
    // Check TTS status periodically when reading
    let statusTimer: NodeJS.Timeout;
    if (isReading) {
      statusTimer = setInterval(() => {
        const status = ttsService.getStatus();
        if (!status.isPlaying && isReading) {
          setIsReading(false);
          setIsPaused(false);
        }
        setIsPaused(status.isPaused);
      }, 1000);
    }
    return () => clearInterval(statusTimer);
  }, [isReading]);

  const handleReadAloud = async () => {
    try {
      if (isReading && !isPaused) {
        // Currently reading - pause it
        await ttsService.pause();
        setIsPaused(true);
      } else if (isReading && isPaused) {
        // Currently paused - resume it
        await ttsService.resume();
        setIsPaused(false);
      } else {
        // Not reading - start reading
        setIsReading(true);
        setIsPaused(false);
        await ttsService.readArticle(article.headline, article.description || '');
        // Will be updated by useEffect when reading finishes
      }
    } catch (error) {
      console.log('TTS Error:', error);
      setIsReading(false);
      setIsPaused(false);
    }
  };

  const stopReading = async () => {
    try {
      await ttsService.stop();
      setIsReading(false);
      setIsPaused(false);
    } catch (error) {
      console.log('TTS Stop Error:', error);
    }
  };

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
  showInApp(url);
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
        <OptimizedImage
          source={{ uri: article.image || article.imageUrl || 'https://picsum.photos/800/600?random=2' }}
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
          <FastTouchable onPress={handleReadAloud} style={[styles.iconButton, isReading && styles.iconButtonActive]}>
            <Text style={[styles.iconText, isReading && styles.iconTextActive]}>
              {isReading ? (isPaused ? '▶' : '⏸') : '🔊'}
            </Text>
          </FastTouchable>
          {isReading && (
            <FastTouchable onPress={stopReading} style={styles.iconButton}>
              <Text style={styles.iconText}>⏹</Text>
            </FastTouchable>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.headline}>{article.headline}</Text>
  {/* Show more lines to allow ~100 words to display on the homepage while preserving responsiveness.
      responsiveLines(...) still controls the baseline, but we ensure a minimum of 10 lines which
      accomodates roughly 100 words on most screen widths. This avoids fixed heights and preserves scrolling. */}
  {/* Show full description (no truncation) per user request */}
  <Text style={[styles.description, { fontSize: scaleFont(15), lineHeight: 22 }]}>
    {article.description || 'No description available.'}
  </Text>

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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    alignSelf: 'center',
    transform: [{ translateX: 0 }],
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
  iconButtonActive: {
    backgroundColor: 'rgba(46, 125, 50, 0.8)', // Green background when active
  },
  iconTextActive: {
    color: '#4CAF50', // Green text when active
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    // allow description text to flow and wrap without being clipped by parent
    overflow: 'visible',
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
