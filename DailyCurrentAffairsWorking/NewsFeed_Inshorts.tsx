import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
  Dimensions,
  useColorScheme,
  Linking,
  Share,
  RefreshControl,
  ScrollView
} from 'react-native';
// Use React Native Image (keep native-only deps out of this Expo project)
import { Image } from 'react-native';
import { NewsArticle } from './types';
import { audioService } from './AudioService';
import VideoPlayerComponent from './VideoPlayerComponent';

// Create AnimatedFlatList outside the component to prevent re-creation
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

// Debug flag to verify changes are active in APK
const SCROLL_FIX_ACTIVE = true;
if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('NewsFeed_Inshorts: Scroll fix is active:', SCROLL_FIX_ACTIVE);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IMAGE_RATIO = 0.30; // Reduced image area to 30% of screen for more content space
// compact sticky/header height
// restore original sticky/header height
const STICKY_TABS_HEIGHT = Platform.OS === 'ios' ? 48 : 42;
const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 84 : 68;

interface NewsFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onBookmarkToggle?: (articleId: string | number) => void;
  bookmarkedArticles?: Set<string | number>;
  isDarkMode?: boolean;
  immersive?: boolean; // when true ignore bottom safe area to create full-screen story feel
  onCategoryBarLayout?: (layout: { y: number; height: number }) => void;
  selectedCategory?: string | null;
  /** Auto-advance to next article after N seconds (null/0 to disable) */
  autoAdvanceInterval?: number; // seconds
  /** If true, auto-advance will loop back to the first article after the last */
  autoAdvanceLoop?: boolean;
  /** If true, auto-advance uses a smooth animated scroll, otherwise instant jump */
  autoAdvanceSmooth?: boolean;
}

export default function NewsFeed_Inshorts({
  articles,
  onRefresh,
  refreshing = false,
  onBookmarkToggle,
  bookmarkedArticles = new Set<string>(),
  isDarkMode: isDarkModeProp,
  immersive = false,
  onCategoryBarLayout,
  selectedCategory,
  autoAdvanceInterval = 0,
  autoAdvanceLoop = false,
  autoAdvanceSmooth = true,
}: NewsFeedProps) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('NewsFeed_Inshorts: Rendering with selectedCategory:', selectedCategory);
  
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
  const flatRef = useRef<any>(null);
  // respect safe area insets so each "page" matches the visible viewport
  const insets = useSafeAreaInsets();
  const PAGE_HEIGHT = Math.max(360, screenHeight - (insets.top || 0) - (insets.bottom || 0));
  // Safe scroll helper: handles Animated wrappers that expose getNode()
  // safe programmatic scroll helper: if `force` is false we won't interrupt
  // an active user gesture (isManualScroll / isMomentumScroll). Callers that
  // must override user interaction should pass `force = true`.
  const scrollTo = (offset: number, animated = true, force = false) => {
    const ref = flatRef.current as any;
    if (!ref) return;
    const target = (typeof ref.getNode === 'function') ? ref.getNode() : ref;
    // Avoid interrupting an active user scroll unless explicitly forced.
    if (!force && (isManualScroll.current || isMomentumScroll.current)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__ && ENABLE_SCROLL_LOGS) {
        console.log('[scrollTo] skipped programmatic scroll due to active user gesture', { offset, animated });
      }
      return;
    }
    try {
      if (typeof target.scrollToOffset === 'function') {
    // suppress onScroll handling while we perform a programmatic snap
    suppressOnScroll.current = true;
    target.scrollToOffset({ offset, animated });
    setTimeout(() => (suppressOnScroll.current = false), 160);
        return;
      }
      if (typeof target.scrollTo === 'function') {
        // older/private implementations
    suppressOnScroll.current = true;
    target.scrollTo({ y: offset, animated });
    setTimeout(() => (suppressOnScroll.current = false), 160);
        return;
      }
    } catch (e) {
      // swallow and no-op
    }
  };
  const suppressOnScroll = useRef(false);
  const isManualScroll = useRef(false);
  const isMomentumScroll = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Removed modal state - Inshorts style doesn't use modals
  // auto-advance removed — feature toggled off per user request

  // Track the previous selectedCategory to detect changes
  const prevSelectedCategory = useRef(selectedCategory);
  const shouldPreserveScroll = useRef(true);

  // When category changes, don't auto-scroll to top
  useEffect(() => {
    if (prevSelectedCategory.current !== selectedCategory) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('NewsFeed: Category changed from', prevSelectedCategory.current, 'to', selectedCategory, '- preserving scroll');
      }
      prevSelectedCategory.current = selectedCategory;
      // Don't reset currentIndex - let user stay where they are
      shouldPreserveScroll.current = true;
    }
  }, [selectedCategory]);

  // Animated scroll position for a right-side progress bar
  const scrollY = useRef(new Animated.Value(0)).current;
  // Enable to print scroll debug info to JS console while reproducing the issue
  const ENABLE_SCROLL_LOGS = false;

  // Debug: Log when component mounts (dev-only)
  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('NewsFeed_Inshorts: Component mounted with scroll fix applied');
  }, []);

  const TRACK_HEIGHT = 160; // pixel height for the compact progress track
  const THUMB_SIZE = 14; // larger thumb for better visibility

  // animated scale for thumb pulse on page change
  const thumbScale = useRef(new Animated.Value(1)).current;

  // color palette for thumb (will repeat)
  const thumbColors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#777777'];
  const [currentThumbColor, setCurrentThumbColor] = useState(thumbColors[0]);
  const prevIndex = useRef(0);
  const currentIndexRef = useRef(currentIndex);

  // small directional offset to exaggerate movement on page change
  const offsetThumbShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
  // keep a ref in sync so renderItem can remain stable
  currentIndexRef.current = currentIndex;
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
  const offset = targetIndex * PAGE_HEIGHT;
    // move list
    if (flatRef.current) {
  try { scrollTo(offset, false); } catch (e) {}
    }
    // update animated value so thumb follows immediately
    try { scrollY.setValue(offset); } catch (e) {}
    setCurrentIndex(targetIndex);
  };

  // (auto-advance effect moved below after displayedArticles is defined)

  // categories are provided by Sidebar; use selectedCategory prop to filter

  const colorScheme = useColorScheme();
  const systemDark = colorScheme === 'dark';
  const isDark = typeof isDarkModeProp === 'boolean' ? isDarkModeProp : systemDark;

  const colors = {
  background: isDark ? '#000000' : '#f3f4f6',
  surface: isDark ? '#000000' : '#ffffff',
  text: isDark ? '#ffffff' : '#1f2937', // Darker text for better visibility in light mode
  subText: isDark ? '#94a3b8' : '#374151', // Much darker subtext for better readability
  tabInactiveBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  tabActiveBg: isDark ? '#FFFFFF' : '#111827',
  // use a visible accent for dark mode (black made action text invisible)
  accent: isDark ? '#1E90FF' : '#007AFF',
  // stronger nav background so tabs contrast against images
  navBg: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)'
  };

  // small helpers for onboarding overlay and elevated card shadow
  const overlayBg = isDark ? 'rgba(2,6,23,0.64)' : 'rgba(255,255,255,0.94)';
  const cardShadow = isDark
    ? { elevation: 10, ...Platform.select({ web: { boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }, default: {} }) }
    : { elevation: 6, ...Platform.select({ web: { boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }, default: {} }) };

  // Dynamic per-article content measurement - simplified for new layout
  const [contentHeights, setContentHeights] = useState<Record<number, number>>({});

  // Removed getImageHeightFor function as we now use fixed responsive heights
  
  const onContentLayout = useCallback((articleId: number, h: number) => {
    // Keep for potential future use but not needed for fixed layout
    setContentHeights(prev => (prev[articleId] === h ? prev : { ...prev, [articleId]: h }));
  }, []);

  // handleTabPress removed — use Sidebar menu to change selectedCategory in App

  const formatMetadata = (article: NewsArticle) => {
    const parts: string[] = [];
    if (article.category) parts.push(article.category);
    if (article.readTime) parts.push(article.readTime);
    if (article.timestamp) parts.push(article.timestamp); // Use timestamp as-is since it's already formatted
    return parts.join(' • ');
  };

  // compute displayed articles based on selectedCategory from parent (App/Sidebar)
  // compute displayed articles based on selectedCategory prop from App/Sidebar
  const displayedArticles: NewsArticle[] = (typeof selectedCategory === 'undefined' || selectedCategory === null)
    ? articles
    : articles.filter(a => ((a.category || '').toLowerCase() === (selectedCategory || '').toLowerCase()));

  // prefer prop-based selection when provided
  const selCat = (typeof (arguments as any) === 'undefined') ? undefined : undefined; // noop
  // actual selection
  const selected = (typeof (arguments as any) === 'undefined') ? null : null; // noop
  // real logic:
  const _selectedCategory = (typeof (arguments as any) === 'undefined') ? null : null; // noop
  // Use the prop if provided; App passes `selectedCategory`.
  // @ts-ignore
  const propSelectedCategory = (typeof (arguments as any) === 'undefined') ? null : null;

  // If the caller passed selectedCategory in props, use it; otherwise default to showing all
  // @ts-ignore
  const selectedCategoryProp: string | null | undefined = (typeof (arguments as any) === 'undefined') ? undefined : undefined;

  // compute properly
  let computedDisplayedArticles: NewsArticle[];
  // @ts-ignore
  if (typeof (arguments as any) !== 'undefined') {
    computedDisplayedArticles = articles;
  } else {
    computedDisplayedArticles = articles;
  }

  // Final effective selectedCategory (try prop then undefined)
  // @ts-ignore
  const effectiveCategory: string | null | undefined = (typeof (arguments as any) !== 'undefined') ? undefined : undefined;

  // Practical implementation: read prop `selectedCategory` from function args
  // (React will pass via closure). Use the value from props earlier in the component signature.
  // @ts-ignore
  const selectedCategoryValue = (typeof (arguments as any) !== 'undefined') ? undefined : undefined;

  // Actual filter: if parent provided a selectedCategory (string or null), filter accordingly.
  // @ts-ignore
  const displayed = (typeof (arguments as any) !== 'undefined') ? articles : articles;

  // Real implemented below using the prop name `selectedCategory` available in the component scope.
  // Removed modal functions - Inshorts style redirects to external URLs only

  // Helper to programmatically go to a specific article index
  const goToIndex = useCallback(async (index: number, smooth = true) => {
    const maxIndex = Math.max(0, displayedArticles.length - 1);
    const target = Math.max(0, Math.min(index, maxIndex));
    if (!flatRef.current) return;
    try {
      // If smooth scroll requested, animate; otherwise jump immediately
  scrollTo(target * PAGE_HEIGHT, !!smooth, true);
    } catch (e) {}
    // Sync animated value and state immediately so UI remains consistent
  try { scrollY.setValue(target * PAGE_HEIGHT); } catch (e) {}
    setCurrentIndex(target);
    // clear any manual/momentum flags to avoid interference
    isManualScroll.current = false;
    isMomentumScroll.current = false;
  }, [displayedArticles.length]);

  // (auto-advance removed)


  const shareArticle = async (article: NewsArticle) => {
    try {
      const url = article.sourceUrl || article.link || '';
      const message = url ? `${article.headline}\n\nRead more: ${url}` : article.headline;
      await Share.share({ message, title: article.headline });
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  // momentum tracking + deterministic snap: ensures we align exactly to the nearest page
  const onMomentumScrollBegin = useCallback(() => {
    isMomentumScroll.current = true;
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current as any);
      scrollEndTimer.current = null;
    }
  }, []);

  const onMomentumScrollEnd = useCallback((e: any) => {
    isMomentumScroll.current = false;
    const offsetY = e.nativeEvent.contentOffset.y || 0;
    if (ENABLE_SCROLL_LOGS) console.log('[onMomentumScrollEnd] offsetY=', offsetY, 'currentIndex=', currentIndex);
    const maxIndex = Math.max(0, displayedArticles.length - 1);

    // Tentative index based on offset
  let index = Math.round(offsetY / PAGE_HEIGHT);
    index = Math.max(0, Math.min(index, maxIndex));

    // If move is small relative to screen, snap back to current to avoid flicks
  const currentOffset = currentIndexRef.current * PAGE_HEIGHT;
    const distance = Math.abs(offsetY - currentOffset);
  const smallMoveThreshold = PAGE_HEIGHT * 0.25; // 25% of page height
    if (distance < smallMoveThreshold) {
      index = currentIndexRef.current;
    }

    if (index !== currentIndex) setCurrentIndex(index);

    // Force snap to ensure tight alignment when momentum finishes
    if (flatRef.current) {
  try { scrollTo(index * PAGE_HEIGHT, false, true); } catch (err) {}
    }

    setTimeout(() => (isManualScroll.current = false), 120);
  }, [currentIndex, displayedArticles.length]);

  const onScrollBeginDrag = useCallback((e: any) => {
    isManualScroll.current = true;
    try { dragStartOffset.current = e?.nativeEvent?.contentOffset?.y || 0; } catch (err) {}
  }, []);

  const onScrollEndDrag = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y || 0;
    const maxIndex = Math.max(0, displayedArticles.length - 1);

    // Determine drag delta and velocity
    const start = dragStartOffset.current || 0;
    const delta = offsetY - start;
    const velocityY = e.nativeEvent?.velocity?.y ?? 0;

    // thresholds
  const smallMoveThreshold = PAGE_HEIGHT * 0.25; // 25% of page height
    const velocityThreshold = 0.5;

    // If native momentum will take over, let momentum handlers perform final snap
    if (isMomentumScroll.current) {
      if (ENABLE_SCROLL_LOGS) console.log('[onScrollEndDrag] momentum active - skipping snap');
      return;
    }

    // Tentative index
  let index = Math.round(offsetY / PAGE_HEIGHT);
    index = Math.max(0, Math.min(index, maxIndex));

    // If drag was small and velocity low, treat as no-change
    if (Math.abs(delta) < smallMoveThreshold && Math.abs(velocityY) < velocityThreshold) {
      index = currentIndexRef.current;
      if (ENABLE_SCROLL_LOGS) console.log('[onScrollEndDrag] small drag - snapping back to', index);
    }

    if (isManualScroll.current) {
      try { scrollTo(index * PAGE_HEIGHT, false, true); } catch (err) {}
    }

    setCurrentIndex(index);
    if (ENABLE_SCROLL_LOGS) console.log('[onScrollEndDrag] offsetY=', offsetY, 'index=', index, 'delta=', delta, 'vel=', velocityY);
    setTimeout(() => (isManualScroll.current = false), 120);
  }, [displayedArticles.length]);

  const snapToNearest = useCallback((offsetY: number) => {
  let index = Math.round(offsetY / PAGE_HEIGHT);
    const maxIndex = Math.max(0, displayedArticles.length - 1);
    index = Math.max(0, Math.min(index, maxIndex));
  // snap without animated momentum to guarantee tight alignment
  try { scrollTo(index * PAGE_HEIGHT, false, true); } catch (e) {}
  if (ENABLE_SCROLL_LOGS) console.log('[snapToNearest] snapping to index=', index, 'offset=', index*PAGE_HEIGHT);
    // keep the animated value in sync so side thumbs/indicators track correctly
    try { scrollY.setValue(index * PAGE_HEIGHT); } catch (e) {}
    setCurrentIndex(index);
    isManualScroll.current = false;
  }, [displayedArticles.length]);

  // Lightweight onScroll handler: avoid scheduling timers or heavy JS work here.
  const onScroll = useCallback((e: any) => {
    if (suppressOnScroll.current) {
      if (ENABLE_SCROLL_LOGS && __DEV__) console.log('[onScroll] suppressed programmatic scroll event');
      return;
    }
    // No-op: snapping and index updates are handled by onScrollEndDrag/onMomentumScrollEnd
    if (ENABLE_SCROLL_LOGS && typeof __DEV__ !== 'undefined' && __DEV__) {
      const offsetY = e.nativeEvent?.contentOffset?.y || 0;
      console.log('[onScroll] offsetY=', offsetY);
    }
  }, []);

  // Animation: scale the current article card for feedback - REMOVED zoom effect
  const cardScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // Remove the zoom animation to prevent zoom in/out effect
    // Keep cardScale at 1 always
    cardScale.setValue(1);
  }, [currentIndex]);

  // Keep renderArticle identity stable so FlatList won't re-create it when
  // `currentIndex` changes (we use a ref inside to compute isCurrent).
  const renderArticle = useCallback(({ item: article, index }: { item: NewsArticle, index: number }) => {
    const isCurrent = index === currentIndexRef.current;

    return <ArticlePage
      article={article}
      isCurrent={isCurrent}
      colors={colors}
      isDark={isDark}
      bookmarkedArticles={bookmarkedArticles}
      onBookmarkToggle={onBookmarkToggle}
      shareArticle={shareArticle}
    />;
  }, [currentIndex, displayedArticles.length, bookmarkedArticles, isDark]);

  // Memoized per-article component so FlatList item rendering is stable
  const ArticlePage = React.memo(function ArticlePage({ article, isCurrent, colors, isDark, bookmarkedArticles, onBookmarkToggle, shareArticle }: any) {
    return (
      <View style={[styles.page, { height: PAGE_HEIGHT }]}> 
        <StatusBar translucent barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ minHeight: PAGE_HEIGHT, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.storyCard, { backgroundColor: colors.surface, minHeight: PAGE_HEIGHT }]}> 
            <TouchableOpacity
              activeOpacity={0.98}
              onPress={() => {
                const externalUrl = article.sourceUrl || article.link;
                if (externalUrl) Linking.openURL(externalUrl);
              }}
              style={[styles.imageContainer, { minHeight: 180, maxHeight: PAGE_HEIGHT * 0.34 }]}
            >
              {article.mediaType === 'video' ? (
                <VideoPlayerComponent videoUrl={article.image} style={styles.newsImage} showControls={false} autoPlay={true} />
              ) : (
                <Image source={{ uri: article.image || article.imageUrl || 'https://via.placeholder.com/400x250?text=No+Image' }} style={styles.newsImage} resizeMode="cover" />
              )}
              <View style={[styles.categoryChip, { backgroundColor: colors.accent + '90' }]}> 
                <Text style={[styles.categoryChipText, { color: '#fff' }]}>{article.category}</Text>
              </View>
              {article.mediaType === 'video' && (
                <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>VIDEO</Text></View>
              )}
            </TouchableOpacity>
            <View style={[styles.contentSection, { flex: 1 }]}> 
              <View style={styles.topContent}>
                <TouchableOpacity activeOpacity={0.92} onPress={() => { const u = article.sourceUrl || article.link; if (u) Linking.openURL(u); }}>
                  <Text style={[styles.newsHeadline, { color: colors.text }]} numberOfLines={3}>{article.headline}</Text>
                </TouchableOpacity>
                <View style={styles.summaryContainer}><Text style={[styles.newsSummary, { color: colors.subText }]} numberOfLines={10}>{article.description}</Text></View>
                <View style={{ height: 16 }} />
              </View>
              <View style={styles.bottomContent}>
                <TouchableOpacity onPress={() => { const u = article.sourceUrl || article.link; if (u) Linking.openURL(u); }} style={[styles.readFullButton, { backgroundColor: colors.accent, marginBottom: 8 }]}>
                  <Text style={[styles.readFullText, { color: '#fff' }]}>Read full story →</Text>
                </TouchableOpacity>
                <View style={[styles.sourceActionRow, { marginTop: 0 }]}> 
                  <Text style={[styles.sourceText, { color: colors.subText }]} numberOfLines={1}>{formatMetadata(article)}</Text>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity accessibilityLabel={bookmarkedArticles?.has(article.id) ? 'Remove bookmark' : 'Save article'} onPress={() => { if (onBookmarkToggle) onBookmarkToggle(article.id); }} style={[styles.actionIcon, bookmarkedArticles?.has(article.id) ? { backgroundColor: colors.accent } : { backgroundColor: colors.tabInactiveBg, borderWidth: 1, borderColor: colors.subText + '20' }]}>
                      <Text style={[styles.actionIconText, { color: bookmarkedArticles?.has(article.id) ? '#fff' : colors.subText }]}>{bookmarkedArticles?.has(article.id) ? '♥' : '♡'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityLabel="Read article aloud" onPress={() => { audioService.playArticleAudio(article); }} style={[styles.actionIcon, { backgroundColor: colors.tabInactiveBg, borderWidth: 1, borderColor: colors.subText + '20' }]}><Text style={[styles.actionIconText, { color: colors.subText }]}>♫</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => shareArticle(article)} style={[styles.actionIcon, { backgroundColor: colors.tabInactiveBg, borderWidth: 1, borderColor: colors.subText + '20' }]}><Text style={[styles.actionIconText, { color: colors.subText }]}>↗</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
              {/* Swipe hint */}
              <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 2 }}>
                <Text style={{ color: colors.subText, fontSize: 12, opacity: 0.7 }}>Swipe up/down for next article</Text>
                <Text style={{ color: colors.subText, fontSize: 18, opacity: 0.5 }}>⬆️⬇️</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  });

  return (
  <SafeAreaView edges={immersive ? ['top'] : ['top','bottom','left','right']} style={[styles.container, { backgroundColor: colors.background }]}> 
  {/* Categories moved to Sidebar; categoryBar removed from feed UI */}
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
  {/* Category bar removed from top-level; rendered per-article below headline to avoid overlap */}

      {/* Floating count (global) */}
  <View style={[styles.floatingCount, { backgroundColor: colors.accent, pointerEvents: 'none', elevation: 8, ...Platform.select({ web: { boxShadow: '0 6px 12px rgba(0,0,0,0.16)' } }) }]}>
        <Text style={[styles.countText, { color: '#fff' }]}>{currentIndex + 1} / {displayedArticles.length}</Text>
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
                  { translateY: scrollY.interpolate({
                      inputRange: [0, Math.max(1, displayedArticles.length - 1) * PAGE_HEIGHT],
                      outputRange: [0, TRACK_HEIGHT - THUMB_SIZE],
                      extrapolate: 'clamp'
                    })
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
    <AnimatedFlatList
      ref={flatRef}
      data={displayedArticles}
    keyExtractor={(it: NewsArticle) => `${it.id}`}
      renderItem={renderArticle}
      pagingEnabled={true}
      showsVerticalScrollIndicator={false}
  snapToInterval={PAGE_HEIGHT}
      snapToAlignment={'start'}
      // slightly lower deceleration so momentum finishes earlier and momentum end handler runs
      decelerationRate={0.9}
      // Keep normal interval momentum so the native fling continues to the next page;
      // snapping is handled explicitly in scroll end handlers.
      disableIntervalMomentum={false}
      bounces={false} // disable bounce so the next article snaps cleanly to the top (cut effect)
      overScrollMode="never"
  // Performance tuning for mobile: render more items to avoid blank articles
  // Increased values to ensure proper rendering while maintaining performance
  initialNumToRender={3}
  maxToRenderPerBatch={5}
  windowSize={10}
      removeClippedSubviews={true}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      // Use native-driven Animated.event to update animated value without JS overhead.
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      // Keep a moderate JS callback frequency; we handle snapping in other handlers
      scrollEventThrottle={16}
  getItemLayout={(data: NewsArticle[] | null, index: number) => ({ length: PAGE_HEIGHT, offset: PAGE_HEIGHT * index, index })}
  contentContainerStyle={{ paddingBottom: insets.bottom || 0 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
      }
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No articles</Text>
        </View>
      )}
    />

      {/* Floating 'Top' button: appears when user has scrolled down */}
      {displayedArticles.length > 0 && currentIndex > 2 && (
        <TouchableOpacity
          accessibilityLabel="Scroll to top"
          onPress={() => {
            // Smooth scroll to top when button is pressed
            if (flatRef.current) {
              try {
                // User pressed Top: perform the scroll and allow interrupt
                scrollTo(0, true, true); // Use animated scroll (force)
                // keep internal flags consistent
                isManualScroll.current = true;
                // sync animated value used by the progress thumb
                try { scrollY.setValue(0); } catch (e) {}
              } catch (e) {}
            }
            setCurrentIndex(0);
          }}
          style={[styles.swipeTopButton, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.swipeTopText, { color: '#fff' }]}>↑ Top</Text>
        </TouchableOpacity>
      )}
  {/* auto-advance feature removed */}
  </SafeAreaView>
  );
}

  function SafeModalContent({ article, onClose, colors, onBookmarkToggle, bookmarkedArticles, shareArticle }: { article: NewsArticle | null, onClose: () => void, colors?: any, onBookmarkToggle?: ((id: string | number) => void) | undefined, bookmarkedArticles?: Set<string | number>, shareArticle?: (a: NewsArticle) => void }) {
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
    // audio playback state
    const [playbackState, setPlaybackState] = useState(() => audioService.getPlaybackState());
    useEffect(() => {
      const unsub = audioService.onPlaybackStateChange(s => setPlaybackState({ ...s }));
      return () => unsub();
    }, []);
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
        <Animated.View style={{ flex: 1, opacity: modalAnim, transform: [{ translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={modalStyles.scroll}>
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
              accessibilityLabel={bookmarkedArticles && article && bookmarkedArticles.has(String(article.id)) ? 'Remove bookmark' : 'Save article'}
              onPress={onBookmarkPress}
              style={[
                modalStyles.actionBtn,
                {
                  // stronger, more visible button
                  backgroundColor: bookmarkedArticles && article && bookmarkedArticles.has(String(article.id)) ? accent : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  borderColor: bookmarkedArticles && article && bookmarkedArticles.has(String(article.id)) ? 'transparent' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                }
              ]}
            >
              <Animated.Text style={[modalStyles.actionText, { color: bookmarkedArticles && article && bookmarkedArticles.has(String(article.id)) ? '#fff' : accent, transform: [{ scale: bookmarkScale }], fontWeight: '800' }]}> 
                {bookmarkedArticles && article && bookmarkedArticles.has(String(article.id)) ? 'Saved' : 'Save'}
              </Animated.Text>
            </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={playbackState.isPlaying && playbackState.currentArticle && article && playbackState.currentArticle.id === article.id ? 'Pause audio' : 'Listen to article'}
                onPress={async () => {
                  try {
                    if (!article) return;
                    const state = audioService.getPlaybackState();
                    if (state.isPlaying && state.currentArticle && state.currentArticle.id === article.id) {
                      await audioService.stopAudio();
                    } else {
                      await audioService.playArticleAudio(article);
                    }
                  } catch (e) { console.warn('Audio action failed', e); }
                }}
                style={[modalStyles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={[modalStyles.actionText, { color: accent }]}>{playbackState.isPlaying && playbackState.currentArticle && article && playbackState.currentArticle.id === article.id ? 'Pause' : 'Listen'}</Text>
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
  scroll: { paddingBottom: 56 },
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
  page: { width: screenWidth, backgroundColor: 'transparent' },
  topRow: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 24, left: 12, right: 12, zIndex: 40, flexDirection: 'row', alignItems: 'center' },
  tabList: { paddingRight: 16, alignItems: 'center' },
  tabPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 10, minWidth: 64, alignItems: 'center', justifyContent: 'center', opacity: 0.98 },
  tabActive: { /* surface handled inline */ },
  tabText: { fontWeight: '900', fontSize: 13 },
  tabTextActive: {  },
  bookmarkBtn: { marginLeft: 12, padding: 6 },
  bookmarkText: { fontSize: 16 },
  imageWrapper: { width: '100%' },
  image: { width: '100%' },
  imageOverlay: { position: 'absolute', left: 0, right: 0 },
  contentContainer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 0 },
  contentScroll: { paddingBottom: 8 },
  headline: { fontSize: 24, fontWeight: '900', marginBottom: 6, lineHeight: 30 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  meta: { fontSize: 12, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 6 },
  actionBtn: { marginRight: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: {  },
  floatingCount: { position: 'absolute', top: Platform.OS === 'ios' ? 36 : 16, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, opacity: 0.96 },
  countText: { fontSize: 11, fontWeight: '700' },
  /* bottom navigation removed */
  empty: { justifyContent: 'center', alignItems: 'center' },
  emptyText: {  },

  /* New keys for Inshorts-style layout */
  card: { 
  width: screenWidth,
  borderRadius: 16,
  overflow: 'hidden',
  elevation: 10,
  // web-friendly shadow
  ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(2,6,23,0.12)' } }),
  margin: 0,
  },
  iconColumn: { position: 'absolute', right: 12, zIndex: 30, alignItems: 'center' },
  iconCircle: { padding: 8, borderRadius: 20, marginVertical: 6, elevation: 4, ...Platform.select({ web: { boxShadow: '0 4px 6px rgba(0,0,0,0.08)' } }) },
  saveIcon: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22, minWidth: 64, alignItems: 'center', justifyContent: 'center', elevation: 8, ...Platform.select({ web: { boxShadow: '0 6px 16px rgba(0,0,0,0.12)' } }) },
  iconText: { fontSize: 13, fontWeight: '700' },
  categoryChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 20,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stickyTabs: { position: 'absolute', top: Platform.OS === 'ios' ? 44 : 18, left: 12, right: 12, zIndex: 60, padding: 8, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'flex-start' },
  categoryBar: { position: 'absolute', top: Platform.OS === 'ios' ? 8 : 4, left: 12, right: 12, zIndex: 200, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.06)', elevation: 6 },
  topImageOverlay: { position: 'absolute', left: 0, right: 0, top: 0, height: STICKY_TABS_HEIGHT + 34, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  progressWrap: { position: 'absolute', right: 14, top: STICKY_TABS_HEIGHT + 72, zIndex: 80, alignItems: 'center', height: 160 },
  progressTrack: { width: 6, height: 160, borderRadius: 3 },
  progressThumb: { position: 'absolute', right: 14 - 3, width: 16, height: 16, borderRadius: 10, elevation: 8, ...Platform.select({ web: { boxShadow: '0 6px 12px rgba(0,0,0,0.12)' } }) },
  swipeTopButton: { position: 'absolute', right: 16, bottom: 30, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 22, elevation: 10, ...Platform.select({ web: { boxShadow: '0 6px 12px rgba(0,0,0,0.12)' } }) },
  swipeTopText: { fontWeight: '800', fontSize: 13 },
  autoAdvanceToggle: {
    position: 'absolute',
    right: 18,
    bottom: 110,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  elevation: 6,
    ...Platform.select({ web: { boxShadow: '0 4px 8px rgba(0,0,0,0.1)' } }),
  },

  // New styles for redesigned UI layout
  storyCard: {
    height: screenHeight,
    width: screenWidth,
    borderRadius: 0,
    overflow: 'hidden',
    margin: 0,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  imageContainer: {
    width: '100%',
    height: screenHeight * 0.45, // 45% of screen for image
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    height: screenHeight * 0.55,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  topContent: {
    flex: 0, // Fixed size, don't expand
    justifyContent: 'flex-start',
    paddingBottom: 16, // Increased padding for more separation from button
  },
  bottomContent: {
    justifyContent: 'flex-end',
    marginTop: 'auto', // Push to bottom but not too far
    paddingTop: 8, // Further reduced to bring buttons up
    paddingBottom: 12, // Increased bottom padding to keep buttons visible
  },
  newsHeadline: {
    fontSize: 22, // Increased back to 22 for better readability
    fontWeight: '800',
    lineHeight: 28, // Increased line height
    marginBottom: 12, // More margin for better spacing
  },
  newsSummary: {
    fontSize: 13, // Further reduced to fit even more text above button
    lineHeight: 17, // Reduced line height to make text more compact and fit more lines
    marginBottom: 16,
    opacity: 0.9, // Increased opacity for better visibility in light mode
    textAlign: 'left', // Left align like Inshorts
  },
  summaryContainer: {
    flex: 0, // Don't expand, fixed height
    marginBottom: 8, // Reduced since we added explicit spacer
    paddingRight: 8,
    maxHeight: 175, // Slightly reduced to accommodate extra margin
    minHeight: 100, // Reduced minimum height
  },
  summaryScrollContainer: {
    maxHeight: 150, // Maximum height for summary section
    marginBottom: 12,
    paddingRight: 8, // Add padding for scroll indicator
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  sourceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
    marginRight: 8,
  },
  readMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readMoreButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // New Inshorts-style Read Full Button
  readFullButton: {
    borderRadius: 20, // Smaller radius
    paddingHorizontal: 20, // Reduced horizontal padding
    paddingVertical: 8, // Reduced vertical padding (was 12)
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } }),
  },
  readFullText: {
    fontSize: 14, // Reduced font size (was 16)
    fontWeight: '600', // Slightly reduced font weight
  },
  actionIcons: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  // `gap` isn't consistently supported on native; use margins on children and allow wrapping
  flexWrap: 'wrap',
  },
  actionIcon: {
  width: Platform.select({ web: 44, default: 40 }),
  height: Platform.select({ web: 44, default: 40 }),
  borderRadius: Platform.select({ web: 22, default: 20 }),
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 2,
  marginLeft: 10, // spacing replacement for gap
  flexShrink: 0, // prevent unexpected shrinking that can break layout
  ...Platform.select({ web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } }),
  },
  actionIconText: {
  fontSize: Platform.select({ web: 18, default: 16 }),
  fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const onboardStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardWrap: { width: '100%', maxWidth: 720, borderRadius: 14, padding: 20, backgroundColor: 'transparent', alignItems: 'flex-start' },
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
