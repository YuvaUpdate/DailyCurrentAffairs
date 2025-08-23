import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
  Dimensions,
  useColorScheme,
  Linking,
  Share,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { NewsArticle } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IMAGE_RATIO = 0.45; // 40-50% for image area per your request
const STICKY_TABS_HEIGHT = Platform.OS === 'ios' ? 64 : 56;
const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 84 : 68;

interface NewsFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onBookmarkToggle?: (articleId: number) => void;
  bookmarkedArticles?: Set<number>;
  isDarkMode?: boolean;
  immersive?: boolean; // when true ignore bottom safe area to create full-screen story feel
}

export default function NewsFeed_Inshorts({
  articles,
  onRefresh,
  refreshing = false,
  onBookmarkToggle,
  bookmarkedArticles = new Set(),
  isDarkMode: isDarkModeProp,
  immersive = false,
}: NewsFeedProps) {
  // onboarding state — show only once per install/user
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingKey = 'seenOnboarding_v1';
  const [onboardingIndex, setOnboardingIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(onboardingKey);
        if (!seen) setShowOnboarding(true);
      } catch (e) {
        // ignore
        setShowOnboarding(true);
      }
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    try { await AsyncStorage.setItem(onboardingKey, 'true'); } catch (e) {}
  }, []);

  const onboardingCards = [
    { title: 'Daily Headlines', subtitle: 'Stay updated with bite-sized current affairs — one story per swipe.' },
    { title: 'Personalized Categories', subtitle: 'Top, Local, Business, Sports and Entertainment — swipe or tap a category.' },
    { title: 'Save & Share', subtitle: 'Save important stories and share them with one tap.' },
    { title: 'Fast, Clean & Secure', subtitle: 'Minimal chrome, fast snapping, and privacy-first features.' }
  ];
  const flatRef = useRef<FlatList>(null);
  const isManualScroll = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('Top');
  const [modalArticle, setModalArticle] = useState<NewsArticle | null>(null);

  // Animated scroll position for a right-side progress bar
  const scrollY = useRef(new Animated.Value(0)).current;
  const TRACK_HEIGHT = 160; // pixel height for the compact progress track
  const THUMB_SIZE = 14; // larger thumb for better visibility

  // animated scale for thumb pulse on page change
  const thumbScale = useRef(new Animated.Value(1)).current;

  // color palette for thumb (will repeat)
  const thumbColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF'];
  const [currentThumbColor, setCurrentThumbColor] = useState(thumbColors[0]);
  const prevIndex = useRef(0);

  // small directional offset to exaggerate movement on page change
  const offsetThumbShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // pulse animation when currentIndex changes
    Animated.sequence([
      Animated.timing(thumbScale, { toValue: 1.35, duration: 140, useNativeDriver: true }),
      Animated.timing(thumbScale, { toValue: 1.0, duration: 140, useNativeDriver: true })
    ]).start();

    // update thumb color based on currentIndex
    const color = thumbColors[currentIndex % thumbColors.length];
    setCurrentThumbColor(color);

    // direction-aware offset: down -> +8, up -> -8
    const direction = currentIndex - (prevIndex.current ?? 0) >= 0 ? 1 : -1;
    prevIndex.current = currentIndex;
    Animated.sequence([
      Animated.timing(offsetThumbShift, { toValue: 8 * direction, duration: 100, useNativeDriver: true }),
      Animated.timing(offsetThumbShift, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [currentIndex]);

  // Create PanResponder for dragging the progress thumb/track
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      // handle initial touch
      const locY = evt.nativeEvent.locationY;
      handleThumbDrag(locY);
    },
    onPanResponderMove: (evt) => {
      const locY = evt.nativeEvent.locationY;
      handleThumbDrag(locY);
    },
    onPanResponderRelease: () => {
      // no-op: snapping is handled by FlatList momentum/end
    }
  })).current;

  const handleThumbDrag = (locY: number) => {
    if (!displayedArticles || displayedArticles.length === 0) return;
    // normalize locY within track
    const y = Math.max(0, Math.min(TRACK_HEIGHT, locY));
    const ratio = y / TRACK_HEIGHT;
    const maxIndex = Math.max(0, displayedArticles.length - 1);
    const targetIndex = Math.round(ratio * maxIndex);
    const offset = targetIndex * screenHeight;
    // move list
    if (flatRef.current) {
      try { flatRef.current.scrollToOffset({ offset, animated: false }); } catch (e) {}
    }
    // update animated value so thumb follows immediately
    try { scrollY.setValue(offset); } catch (e) {}
    setCurrentIndex(targetIndex);
  };

  const tabs = ['Top', 'Local', 'Business', 'Sports', 'Entertainment'];

  const colorScheme = useColorScheme();
  const systemDark = colorScheme === 'dark';
  const isDark = typeof isDarkModeProp === 'boolean' ? isDarkModeProp : systemDark;

  const colors = {
    background: isDark ? '#0f172a' : '#f3f4f6',
    surface: isDark ? '#0b1220' : '#ffffff',
    text: isDark ? '#ffffff' : '#111827',
    subText: isDark ? '#94a3b8' : '#6b7280',
    tabInactiveBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  tabActiveBg: isDark ? '#111827' : '#ffffff',
  accent: isDark ? '#1E90FF' : '#007AFF',
    navBg: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'
  };

  // Dynamic per-article content measurement to eliminate bottom gap while preserving snap
  const [contentHeights, setContentHeights] = useState<Record<number, number>>({});

  const getImageHeightFor = useCallback((articleId: number) => {
    const measured = contentHeights[articleId];
    const fallback = Math.round(screenHeight * IMAGE_RATIO); // initial ratio before measure
    const minImage = Math.round(screenHeight * 0.40); // keep image at least ~40% of screen
    const maxImage = screenHeight - 80; // avoid covering entire screen (leave space for text paddings)
    if (!measured || measured <= 0) return fallback;
    // Compute remaining space for image so card fills exactly the screen height
    const computed = screenHeight - measured;
    return Math.max(minImage, Math.min(maxImage, computed));
  }, [contentHeights]);

  const onContentLayout = useCallback((articleId: number, h: number) => {
    setContentHeights(prev => (prev[articleId] === h ? prev : { ...prev, [articleId]: h }));
  }, []);

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    // if you want to filter articles by tab add logic here
  flatRef.current?.scrollToOffset({ offset: 0, animated: true });
  setCurrentIndex(0);
  };

  const formatMetadata = (article: NewsArticle) => {
    const parts: string[] = [];
    if (article.category) parts.push(article.category);
    if (article.readTime) parts.push(article.readTime);
    if (article.timestamp) parts.push(new Date(article.timestamp).toLocaleDateString());
    return parts.join(' • ');
  };

  // compute displayed articles based on activeTab
  const displayedArticles = activeTab === 'Top'
    ? articles
    : articles.filter(a => (a.category || '').toLowerCase() === activeTab.toLowerCase());
  const openModal = (article: NewsArticle) => {
    setModalArticle(article);
  };

  const closeModal = () => setModalArticle(null);

  const shareArticle = async (article: NewsArticle) => {
    try {
      const url = article.sourceUrl || article.link || '';
      const message = url ? `${article.headline}\n\nRead more: ${url}` : article.headline;
      await Share.share({ message, title: article.headline });
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  // deterministic snap: on momentum end, compute nearest index and scrollToOffset
  const onMomentumScrollEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y || 0;
    let index = Math.round(offsetY / screenHeight);
    const maxIndex = Math.max(0, displayedArticles.length - 1);
    index = Math.max(0, Math.min(index, maxIndex));
    if (index !== currentIndex) setCurrentIndex(index);
    // ensure exact alignment
    if (flatRef.current) flatRef.current.scrollToOffset({ offset: index * screenHeight, animated: true });
    // small debounce guard
    setTimeout(() => (isManualScroll.current = false), 250);
  }, [currentIndex]);

  const onScrollBeginDrag = useCallback(() => {
    isManualScroll.current = true;
  }, []);

  const onScrollEndDrag = useCallback((e: any) => {
    // Enforce snap when user stops dragging (helps web where momentum isn't fired)
    const offsetY = e.nativeEvent.contentOffset.y || 0;
  let index = Math.round(offsetY / screenHeight);
  const maxIndex = Math.max(0, displayedArticles.length - 1);
  index = Math.max(0, Math.min(index, maxIndex));
  if (flatRef.current) flatRef.current.scrollToOffset({ offset: index * screenHeight, animated: true });
  setCurrentIndex(index);
    // small debounce
    setTimeout(() => (isManualScroll.current = false), 200);
  }, []);

  const snapToNearest = useCallback((offsetY: number) => {
    let index = Math.round(offsetY / screenHeight);
    const maxIndex = Math.max(0, displayedArticles.length - 1);
    index = Math.max(0, Math.min(index, maxIndex));
    if (flatRef.current) flatRef.current.scrollToOffset({ offset: index * screenHeight, animated: true });
    setCurrentIndex(index);
    isManualScroll.current = false;
  }, [displayedArticles.length]);

  const onScroll = useCallback((e: any) => {
    // debounce scroll end to call snapToNearest
    const offsetY = e.nativeEvent.contentOffset.y || 0;
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current as any);
      scrollEndTimer.current = null;
    }
    // set a short timer; when no scroll events for 120ms we snap
    // store numeric id
    // @ts-ignore
    scrollEndTimer.current = setTimeout(() => snapToNearest(offsetY) as unknown as number, 120);
  }, [snapToNearest]);

  const renderArticle = ({ item: article }: { item: NewsArticle }) => {
    // compute dynamic image height based on measured text/content height
    const dynH = getImageHeightFor(article.id);
    return (
      <View style={styles.page}>
        <StatusBar translucent barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            activeOpacity={0.98}
            style={[styles.imageWrapper, { height: dynH, backgroundColor: colors.surface }]}
            onPress={() => openModal(article)}
          >
            <Image
              source={{ uri: article.image || article.imageUrl || 'https://via.placeholder.com/600x900?text=No+Image' }}
              style={[styles.image, {
                height: dynH,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              }]}
              resizeMode="cover"
            />

            {/* Category chip overlay */}
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{article.category || 'Top'}</Text>
            </View>

            {/* subtle overlay for text contrast */}
            <View style={[styles.imageOverlay, { height: Math.round(dynH * 0.36), bottom: 0, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.18)', pointerEvents: 'none' }]} />

            {/* Small action icons positioned relative to image height (avoid overlapping status bar) */}
            <View style={[styles.iconColumn, { top: Math.max(8, dynH - 48), pointerEvents: 'box-none' }]}>
              <TouchableOpacity onPress={() => onBookmarkToggle && onBookmarkToggle(article.id)} style={[styles.iconCircle, { backgroundColor: colors.surface ?? undefined }]}> 
                <Text style={[styles.iconText, { color: colors.text }, bookmarkedArticles.has(article.id) && { color: isDark ? '#ff7675' : '#e53935' }]}>{bookmarkedArticles.has(article.id) ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareArticle(article)} style={styles.iconCircle}>
                <Text style={[styles.iconText, { color: colors.text }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={`Open article ${article.headline}`}
            activeOpacity={0.92}
            onPress={() => openModal(article)}
            style={[styles.contentContainer, { backgroundColor: colors.surface }]}
            onLayout={(e) => onContentLayout(article.id, e.nativeEvent.layout.height)}
          >
            <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>{article.headline}</Text>
            <Text style={[styles.description, { color: colors.text }]} numberOfLines={3}>{article.description}</Text>
            <Text style={[styles.meta, { color: colors.subText }]}>{formatMetadata(article)}</Text>
          </TouchableOpacity>
        </View>

        {/* Floating count and bottom nav are rendered globally */}
      </View>
    );
  };

  // overlay + card colors for onboarding (theme-aware)
  const overlayBg = isDark ? 'rgba(2,6,23,0.72)' : 'rgba(255,255,255,0.98)';
  const cardShadow = {
    boxShadow: isDark ? '0 10px 20px rgba(0, 0, 0, 0.28)' : '0 10px 20px rgba(0, 0, 0, 0.06)',
    elevation: 12
  };

  return (
  <SafeAreaView edges={immersive ? ['top'] : ['top','bottom','left','right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Onboarding carousel shown only on first launch */}
      {showOnboarding && (
        <View style={[onboardStyles.overlay, { backgroundColor: overlayBg }]}> 
          <View style={[onboardStyles.cardWrap, { backgroundColor: colors.surface, ...cardShadow }]}> 
            <Text style={[onboardStyles.cardTitle, { color: colors.text }]}>{onboardingCards[onboardingIndex].title}</Text>
            <Text style={[onboardStyles.cardSubtitle, { color: colors.subText }]}>{onboardingCards[onboardingIndex].subtitle}</Text>
            <View style={onboardStyles.dots}>
              {onboardingCards.map((c, i) => (
                <View key={`dot-${i}`} style={[onboardStyles.dot, i === onboardingIndex ? { backgroundColor: colors.accent, width: 12, height: 12 } : { backgroundColor: colors.subText, width: 8, height: 8 }]} />
              ))}
            </View>
          </View>

          <View style={onboardStyles.controls}>
            <TouchableOpacity onPress={async () => { await AsyncStorage.setItem(onboardingKey, 'true'); setShowOnboarding(false); }} style={onboardStyles.skipBtn}>
              <Text style={[onboardStyles.skipText, { color: colors.subText }]}>Skip</Text>
            </TouchableOpacity>
            {onboardingIndex < onboardingCards.length - 1 ? (
              <TouchableOpacity onPress={() => setOnboardingIndex(i => Math.min(onboardingCards.length - 1, i + 1))} style={[onboardStyles.nextBtn, { backgroundColor: colors.accent }]}> 
                <Text style={[onboardStyles.nextText, { color: '#fff' }]}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={completeOnboarding} style={[onboardStyles.nextBtn, { backgroundColor: colors.accent }]}> 
                <Text style={[onboardStyles.nextText, { color: '#fff' }]}>Get started</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      {/* Category bar (visible and opaque) */}
  <View style={[styles.categoryBar, { backgroundColor: colors.tabInactiveBg }]}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          keyExtractor={(t) => t}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              onPress={() => handleTabPress(t)}
              style={[styles.tabPill, { backgroundColor: activeTab === t ? colors.tabActiveBg : colors.tabInactiveBg }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? colors.accent : colors.subText }]}>{t}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Floating count (global) */}
      <View style={[styles.floatingCount, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)', pointerEvents: 'none' }]}>
        <Text style={[styles.countText, { color: isDark ? '#fff' : '#111' }]}>{currentIndex + 1} / {displayedArticles.length}</Text>
      </View>

      {/* Right-side progress bar (compact) */}
      {displayedArticles.length > 0 && (
        <View style={[styles.progressWrap, { height: TRACK_HEIGHT, pointerEvents: 'none' }]}>
          <View style={[styles.progressTrack, { height: TRACK_HEIGHT, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }]} />
      <Animated.View
            style={[
              styles.progressThumb,
              {
        backgroundColor: currentThumbColor,
                transform: [
                  { translateY: Animated.add(scrollY.interpolate({
                      inputRange: [0, Math.max(1, displayedArticles.length - 1) * screenHeight],
                      outputRange: [0, TRACK_HEIGHT - THUMB_SIZE],
                      extrapolate: 'clamp'
                    }), offsetThumbShift)
                  },
                  { scale: thumbScale }
                ]
              }
            ]}
          />
        </View>
      )}

      {/* Filter articles by active tab */}
      {/** For 'Top' show all, otherwise filter by category (case-insensitive) **/}
      {/** Compute displayedArticles here so FlatList uses it */}
      
      {/* ...existing code... */}
    <FlatList
        ref={flatRef}
        data={displayedArticles}
        keyExtractor={(it) => `${it.id}-${activeTab}`}
        renderItem={renderArticle}
  pagingEnabled={true} // use native paging so the list snaps one item per swipe
        showsVerticalScrollIndicator={false}
  snapToInterval={screenHeight} // helps on native
        decelerationRate="fast"
  onScrollBeginDrag={onScrollBeginDrag}
  onScrollEndDrag={onScrollEndDrag}
  onMomentumScrollEnd={onMomentumScrollEnd}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: onScroll }
  )}
  scrollEventThrottle={16}
  disableIntervalMomentum={true}
  bounces={false}
  getItemLayout={(data, index) => ({ length: screenHeight, offset: screenHeight * index, index })}
  // remove padding that causes gaps - tabs are positioned absolutely
  contentContainerStyle={{ paddingBottom: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No articles</Text>
          </View>
        )}
      />

      {/* Modal for full article */}
          <Modal visible={!!modalArticle} animationType="slide" onRequestClose={closeModal}>
            <SafeModalContent
              article={modalArticle}
              onClose={closeModal}
              colors={colors}
              onBookmarkToggle={onBookmarkToggle}
              bookmarkedArticles={bookmarkedArticles}
              shareArticle={shareArticle}
            />
          </Modal>
  </SafeAreaView>
  );
}

  function SafeModalContent({ article, onClose, colors, onBookmarkToggle, bookmarkedArticles, shareArticle }: { article: NewsArticle | null, onClose: () => void, colors?: any, onBookmarkToggle?: ((id: number) => void) | undefined, bookmarkedArticles?: Set<number>, shareArticle?: (a: NewsArticle) => void }) {
    const scheme = useColorScheme();
    const systemDark = scheme === 'dark';
    const isDark = colors ? (colors.background && colors.background !== '#f3f4f6') : systemDark;

    // modal entrance animation (hook must run unconditionally)
    const modalAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(modalAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }, []);

    // bookmark tap animation (hook must run unconditionally)
    const bookmarkScale = useRef(new Animated.Value(1)).current;
    const onBookmarkPress = () => {
      Animated.sequence([
        Animated.timing(bookmarkScale, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.timing(bookmarkScale, { toValue: 1.0, duration: 180, useNativeDriver: true })
      ]).start();
      if (onBookmarkToggle && article) onBookmarkToggle(article.id);
    };

    if (!article) return null;

    const bg = colors?.background ?? (isDark ? '#000' : '#fff');
    const surface = colors?.surface ?? (isDark ? '#0b1220' : '#ffffff');
    const text = colors?.text ?? (isDark ? '#fff' : '#111');
    const subText = colors?.subText ?? (isDark ? '#9aa4b2' : '#666');
    const accent = colors?.accent ?? (isDark ? '#1E90FF' : '#007AFF');

    return (
      <View style={[modalStyles.container, { backgroundColor: bg }]}> 
        <Animated.View style={{ opacity: modalAnim, transform: [{ translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <ScrollView contentContainerStyle={modalStyles.scroll}>
            <Image source={{ uri: article.image || article.imageUrl }} style={modalStyles.image} resizeMode="cover" />
            <Text style={[modalStyles.title, { color: text }]}>{article.headline}</Text>
            <Text style={[modalStyles.meta, { color: subText }]}>{(article.readTime ? article.readTime + ' • ' : '') + (article.category || '')}</Text>
            <View style={modalStyles.divider} />
            <Text style={[modalStyles.body, { color: text }]}>{article.description}</Text>
            {article.sourceUrl ? (
              <TouchableOpacity accessibilityLabel="Open original source" onPress={() => { if (article.sourceUrl) Linking.openURL(article.sourceUrl); }} style={[modalStyles.linkBtn, { backgroundColor: surface, borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[modalStyles.linkText, { color: accent }]}>Open original</Text>
              </TouchableOpacity>
            ) : null}

            {/* Actions inside modal */}
            <View style={modalStyles.actionsRow}>
              <TouchableOpacity
                accessibilityLabel={bookmarkedArticles && article && bookmarkedArticles.has(article.id) ? 'Remove bookmark' : 'Bookmark article'}
                onPress={onBookmarkPress}
                style={[modalStyles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Animated.Text style={[modalStyles.actionText, { color: bookmarkedArticles && article && bookmarkedArticles.has(article.id) ? (isDark ? '#ff7675' : '#e53935') : accent, transform: [{ scale: bookmarkScale }] }]}>{bookmarkedArticles && article && bookmarkedArticles.has(article.id) ? 'Bookmarked' : 'Bookmark'}</Animated.Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Share article"
                onPress={() => { if (article && shareArticle) shareArticle(article); }}
                style={[modalStyles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={[modalStyles.actionText, { color: accent }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>

        {/* More visible, theme-aware close button */}
        <TouchableOpacity
          accessibilityLabel="Close article"
          onPress={onClose}
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 48 : 24,
            right: 16,
            backgroundColor: accent,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 18,
            elevation: 6,
            boxShadow: isDark ? '0 6px 8px rgba(0, 0, 0, 0.18)' : '0 6px 8px rgba(68, 68, 68, 0.18)',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },
  image: { width: '100%', height: 300 },
  title: { fontSize: 22, fontWeight: '700', padding: 16 },
  meta: { paddingHorizontal: 16, marginBottom: 8 },
  body: { padding: 16, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 12 },
  linkBtn: { margin: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  linkText: { },
  closeBtn: { position: 'absolute', top: 40, right: 16, padding: 8, borderRadius: 6 },
  closeText: { }
  ,
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, marginBottom: 8 },
  actionBtn: { marginRight: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  actionText: { fontWeight: '700' }
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { height: screenHeight, width: screenWidth, backgroundColor: 'transparent' },
  topRow: { position: 'absolute', top: Platform.OS === 'ios' ? 48 : 24, left: 12, right: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center' },
  tabList: { paddingRight: 12 },
  tabPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 10 },
  tabActive: { /* surface handled inline */ },
  tabText: { fontWeight: '700', fontSize: 14 },
  tabTextActive: {  },
  bookmarkBtn: { marginLeft: 12, padding: 6 },
  bookmarkText: { fontSize: 16 },
  imageWrapper: { width: '100%' },
  image: { width: '100%' },
  imageOverlay: { position: 'absolute', left: 0, right: 0 },
  contentContainer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 0 },
  headline: { fontSize: 30, fontWeight: '900', marginBottom: 6, lineHeight: 38 },
  description: { fontSize: 15, lineHeight: 20, marginBottom: 2 },
  meta: { fontSize: 12, marginBottom: 0 },
  actionsRow: { flexDirection: 'row', marginTop: 6 },
  actionBtn: { marginRight: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: {  },
  floatingCount: { position: 'absolute', top: Platform.OS === 'ios' ? 48 : 24, right: 16, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  countText: { fontSize: 12 },
  /* bottom navigation removed */
  empty: { height: screenHeight, justifyContent: 'center', alignItems: 'center' },
  emptyText: {  },

  /* New keys for Inshorts-style layout */
  card: { 
    height: screenHeight, 
    width: screenWidth, 
    borderRadius: 12, 
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 6,
    margin: 0,
  },
  iconColumn: { position: 'absolute', right: 12, zIndex: 30, alignItems: 'center' },
  iconCircle: { padding: 8, borderRadius: 20, marginVertical: 6, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.08)', elevation: 4 },
  iconText: { fontSize: 14, fontWeight: '600' },
  categoryChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stickyTabs: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 18, left: 12, right: 12, zIndex: 60, padding: 8, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'flex-start' },
  categoryBar: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 18, left: 12, right: 12, zIndex: 70, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, boxShadow: '0 6px 8px rgba(0, 0, 0, 0.06)', elevation: 6 },
  progressWrap: { position: 'absolute', right: 10, top: STICKY_TABS_HEIGHT + 72, zIndex: 80, alignItems: 'center', height: 160 },
  progressTrack: { width: 4, height: 160, borderRadius: 2 },
  progressThumb: { position: 'absolute', right: 10 - 2, width: 14, height: 14, borderRadius: 8 },
});

const onboardStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 720, borderRadius: 12, padding: 24, backgroundColor: 'transparent', alignItems: 'flex-start' },
  cardTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  cardSubtitle: { fontSize: 16, lineHeight: 22, marginBottom: 12 },
  dots: { flexDirection: 'row', marginTop: 10 },
  dot: { borderRadius: 8, marginHorizontal: 6 },
  controls: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 12 },
  skipBtn: { padding: 10 },
  skipText: { fontSize: 14 },
  nextBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  nextText: { fontSize: 15, fontWeight: '700' }
});
