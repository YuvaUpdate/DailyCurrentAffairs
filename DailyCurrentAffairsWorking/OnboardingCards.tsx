import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import FastTouchable from './FastTouchable';
import InitializationService from './InitializationService';

interface Props {
  visible?: boolean;
  onClose: () => void;
}

// Pre-calculate dimensions to avoid repeated calculations
const { width: screenWidth } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(screenWidth * 0.92, 680);

const CARDS = [
  {
    id: 'welcome',
    title: 'Welcome to YuvaUpdate',
    description: 'Clear, trustworthy news in bite-sized summaries — perfect for busy schedules.',
  },
  {
    id: 'briefs',
    title: 'Daily Briefs',
    description: 'Get concise updates and the key facts you need each day — no fluff, just the news.',
  },
  {
    id: 'share',
    title: 'Quick to Share',
    description: 'Easily share important stories with friends and keep conversations informed.',
  },
];

function OnboardingCards({ visible = true, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const transitioningRef = useRef(false);
  const [servicesReady, setServicesReady] = useState(false);

  // Check if services are ready when component mounts
  useEffect(() => {
    const initService = InitializationService.getInstance();
    const checkStatus = () => {
      const status = initService.getStatus();
      setServicesReady(status.isReady);
      // Only log once when ready, not continuously
      if (status.isReady && !servicesReady) {
        console.log('✅ OnboardingCards: All services ready');
      }
    };
    
    checkStatus();
    // Check periodically but stop once ready or after timeout
    const statusTimer = setInterval(() => {
      checkStatus();
      // Stop checking after services are ready
      if (servicesReady) {
        clearInterval(statusTimer);
      }
    }, 1000); // Check every 1 second instead of 500ms
    
    // Cleanup after 10 seconds max
    const cleanupTimer = setTimeout(() => clearInterval(statusTimer), 10000);
    
    return () => {
      clearInterval(statusTimer);
      clearTimeout(cleanupTimer);
    };
  }, [servicesReady]);

  // Memoize modal width calculation
  const modalWidth = useMemo(() => MODAL_WIDTH, []);

  // Memoized card renderer to prevent re-renders
  const renderCard = useCallback((card: typeof CARDS[0]) => (
    <View key={card.id} style={[styles.card, { width: modalWidth }]}> 
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.desc}>{card.description}</Text>
    </View>
  ), [modalWidth]);

  // Optimized navigation functions with service readiness check
  const goNext = useCallback(() => {
    console.log('🔄 goNext called, index:', index, 'transitioning:', transitioningRef.current, 'servicesReady:', servicesReady);
    
    if (transitioningRef.current) {
      console.log('⏸️ Already transitioning, ignoring');
      return;
    }
    
    if (!servicesReady) {
      console.log('⚠️ Services not ready yet, waiting...');
      return;
    }
    
    if (index < CARDS.length - 1) {
      const next = index + 1;
      console.log('➡️ Moving to next card:', next);
      transitioningRef.current = true;
      setIndex(next);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ x: next * modalWidth, y: 0, animated: false });
      }
      
      setTimeout(() => {
        transitioningRef.current = false;
        console.log('✅ Transition complete');
      }, 50);
    } else {
      console.log('🏁 Last card, closing onboarding');
      onClose();
    }
  }, [index, modalWidth, onClose, servicesReady]);

  const goPrev = useCallback(() => {
    if (transitioningRef.current) return;
    
    if (index > 0) {
      const prev = index - 1;
      transitioningRef.current = true;
      setIndex(prev);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ x: prev * modalWidth, y: 0, animated: false });
      }
      
      setTimeout(() => {
        transitioningRef.current = false;
      }, 50);
    }
  }, [index, modalWidth]);

  // Memoized scroll handler
  const handleScrollEnd = useCallback((e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / modalWidth);
    setIndex(i);
    transitioningRef.current = false;
  }, [modalWidth]);

  return (
    <Modal visible={visible} animationType="none" transparent={false}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { width: modalWidth }]}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            snapToInterval={modalWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            removeClippedSubviews={true}
            style={{ width: modalWidth }}
          >
            {CARDS.map(renderCard)}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {CARDS.map((_, i) => (
                <View key={i} style={[styles.dot, i === index ? styles.dotActive : undefined]} />
              ))}
            </View>

            <FastTouchable 
              style={[styles.button, !servicesReady && styles.buttonDisabled]} 
              onPress={() => {
                console.log('🔘 Button pressed! Services ready:', servicesReady);
                if (servicesReady) {
                  goNext();
                } else {
                  console.log('⏰ Services not ready, button disabled');
                }
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              delayPressIn={0}
              delayPressOut={0}
              disabled={!servicesReady}
            >
              <Text style={[styles.buttonText, !servicesReady && styles.buttonTextDisabled]}>
                {!servicesReady ? 'Initializing...' : (index === CARDS.length - 1 ? 'Get started' : 'Next')}
              </Text>
            </FastTouchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '86%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  card: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    color: '#1f2937',
  },
  desc: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 20,
    paddingHorizontal: 8
  },
  footer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  pagination: { 
    flexDirection: 'row', 
    marginBottom: 8 
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#d1d5db', 
    margin: 4 
  },
  dotActive: { 
    backgroundColor: '#2563EB' 
  },
  button: { 
    backgroundColor: '#2563EB', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  buttonTextDisabled: {
    color: '#d1d5db',
  }
});

export default React.memo(OnboardingCards);
